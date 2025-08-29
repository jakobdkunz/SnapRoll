import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireStudentEnrollment, requireCurrentUser } from "./_auth";
import { checkAndIncrementRateLimit } from "./_rateLimit";

export const startWordCloud = mutation({
  args: {
    sectionId: v.id("sections"),
    prompt: v.string(),
    showPromptToStudents: v.optional(v.boolean()),
    allowMultipleAnswers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);

    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `wc:start:${args.sectionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    return await ctx.db.insert("wordCloudSessions", {
      sectionId: args.sectionId,
      prompt: args.prompt,
      showPromptToStudents: args.showPromptToStudents ?? true,
      allowMultipleAnswers: args.allowMultipleAnswers ?? false,
      createdAt: Date.now(),
    });
  },
});

export const getActiveWordCloud = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    // Allow teachers who own the section or enrolled students
    try {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    } catch {
      try {
        await requireStudentEnrollment(ctx, args.sectionId as Id<"sections">);
      } catch {
        throw new Error("Forbidden");
      }
    }
    return await ctx.db
      .query("wordCloudSessions")
      .withIndex("by_section_active", (q) => 
        q.eq("sectionId", args.sectionId).eq("closedAt", undefined)
      )
      .first();
  },
});

export const submitAnswer = mutation({
  args: {
    sessionId: v.id("wordCloudSessions"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await requireCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("WordCloud session not found");
    await requireStudentEnrollment(ctx, session.sectionId as Id<"sections">);

    // Enforce 25-char limit (server-side) and max 25 submissions per student per session
    const text = (args.text || "").trim();
    if (text.length === 0) throw new Error("Text required");
    if (text.length > 25) throw new Error("Max 25 characters");

    const countForStudent = await ctx.db
      .query("wordCloudAnswers")
      .withIndex("by_session_student", (q) => q.eq("sessionId", args.sessionId).eq("studentId", caller._id))
      .collect();
    if (countForStudent.length >= 25) throw new Error("Submission limit reached");

    // Generous loop-protection rate limit: 240 submissions / 10 minutes per student per session
    const rl = await checkAndIncrementRateLimit(ctx, caller._id, `wc:answer:${args.sessionId}` as any, 10 * 60 * 1000, 240);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    // Check if student already submitted this exact text
    const existingAnswer = await ctx.db
      .query("wordCloudAnswers")
      .withIndex("by_session_student_text", (q) => 
        q.eq("sessionId", args.sessionId)
         .eq("studentId", caller._id)
         .eq("text", args.text)
      )
      .first();

    if (existingAnswer) {
      throw new Error("You already submitted this word");
    }

    // If multiple answers not allowed, check if student has any answers
    if (!session.allowMultipleAnswers) {
      const existingAnswers = await ctx.db
        .query("wordCloudAnswers")
        .withIndex("by_session_student", (q) => 
          q.eq("sessionId", args.sessionId).eq("studentId", caller._id)
        )
        .collect();

      if (existingAnswers.length > 0) {
        throw new Error("Multiple answers not allowed");
      }
    }

    return await ctx.db.insert("wordCloudAnswers", {
      sessionId: args.sessionId,
      studentId: caller._id,
      text,
      createdAt: Date.now(),
    });
  },
});

export const getResults = query({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    // Only owner teacher or when public
    if (session.closedAt === undefined) {
      // Active: allow enrolled students or owner
      try {
        await requireStudentEnrollment(ctx, session.sectionId as Id<"sections">);
      } catch {
        const teacher = await requireTeacher(ctx);
        await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      }
    } else {
      // Closed: still restrict to enrolled students or owner
      try {
        await requireStudentEnrollment(ctx, session.sectionId as Id<"sections">);
      } catch {
        const teacher = await requireTeacher(ctx);
        await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      }
    }

    const answers = await ctx.db
      .query("wordCloudAnswers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Group by text and count occurrences
    const wordCounts = new Map<string, number>();
    answers.forEach(answer => {
      const count = wordCounts.get(answer.text) || 0;
      wordCounts.set(answer.text, count + 1);
    });

    const results = Array.from(wordCounts.entries()).map(([text, count]) => ({
      text,
      count,
    })).sort((a, b) => b.count - a.count);

    return {
      session,
      results,
      totalAnswers: answers.length,
    };
  },
});

export const closeWordCloud = mutation({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("WordCloud session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);

    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `wc:close:${args.sessionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    await ctx.db.patch(args.sessionId, {
      closedAt: Date.now(),
    });
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("WordCloud session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
    await ctx.db.patch(args.sessionId, {
      instructorLastSeenAt: Date.now(),
    });
  },
});

export const getActiveSession = query({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getAnswers = query({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wordCloudAnswers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const closeSession = mutation({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      closedAt: Date.now(),
    });
  },
});
