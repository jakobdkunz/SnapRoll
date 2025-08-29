import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireStudentEnrollment, requireCurrentUser } from "./_auth";
import { checkAndIncrementRateLimit } from "./_rateLimit";

export const startPoll = mutation({
  args: {
    sectionId: v.id("sections"),
    prompt: v.string(),
    options: v.array(v.string()),
    showResults: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);

    // Generous rate limit: 60 operations / 5 minutes per teacher per section
    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `poll:start:${args.sectionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    // Input validation (generous):
    const prompt = (args.prompt || "").trim();
    if (prompt.length === 0 || prompt.length > 500) throw new Error("Prompt must be 1-500 chars");
    const options = (args.options || []).map((o) => (o || "").trim()).filter(Boolean);
    if (options.length < 2 || options.length > 20) throw new Error("Provide 2-20 options");
    for (const o of options) {
      if (o.length === 0 || o.length > 100) throw new Error("Option text must be 1-100 chars");
    }

    return await ctx.db.insert("pollSessions", {
      sectionId: args.sectionId,
      prompt,
      optionsJson: JSON.stringify(options),
      showResults: args.showResults ?? true,
      createdAt: Date.now(),
    });
  },
});

export const getActivePoll = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    // Allow teachers who own the section or enrolled students to view basic session info
    try {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    } catch {
      // If not teacher owner, require student enrollment
      try {
        await requireStudentEnrollment(ctx, args.sectionId as Id<"sections">);
      } catch {
        throw new Error("Forbidden");
      }
    }
    return await ctx.db
      .query("pollSessions")
      .withIndex("by_section_active", (q) => 
        q.eq("sectionId", args.sectionId).eq("closedAt", undefined)
      )
      .first();
  },
});

export const submitAnswer = mutation({
  args: {
    sessionId: v.id("pollSessions"),
    optionIdx: v.number(),
  },
  handler: async (ctx, args) => {
    // Bind identity; ensure student is enrolled in the session's section
    const { _id: callerId } = await requireCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Poll session not found");
    await requireStudentEnrollment(ctx, session.sectionId as Id<"sections">);

    // Generous rate limit: 120 answers / 10 minutes per student per session (prevents loops)
    const rl = await checkAndIncrementRateLimit(ctx, callerId, `poll:answer:${args.sessionId}` as any, 10 * 60 * 1000, 120);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    // Check if student already answered
    const existingAnswer = await ctx.db
      .query("pollAnswers")
      .withIndex("by_session_student", (q) => 
        q.eq("sessionId", args.sessionId).eq("studentId", callerId)
      )
      .first();

    if (existingAnswer) {
      // Do not allow changing selection
      throw new Error("You already voted");
    } else {
      // Create new answer
      return await ctx.db.insert("pollAnswers", {
        sessionId: args.sessionId,
        studentId: callerId,
        optionIdx: args.optionIdx,
        createdAt: Date.now(),
      });
    }
  },
});

export const getResults = query({
  args: { sessionId: v.id("pollSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    // Only owner teacher or when showResults is true
    if (!session.showResults) {
      try {
        const teacher = await requireTeacher(ctx);
        await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      } catch {
        throw new Error("Forbidden");
      }
    } else {
      // If results are public, still require student enrollment or teacher owner
      try {
        await requireStudentEnrollment(ctx, session.sectionId as Id<"sections">);
      } catch {
        const teacher = await requireTeacher(ctx);
        await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);
      }
    }

    const answers = await ctx.db
      .query("pollAnswers")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const options = JSON.parse(session.optionsJson);
    const results = options.map((option: string, idx: number) => ({
      option,
      count: answers.filter(a => a.optionIdx === idx).length,
    }));

    return {
      session,
      results,
      totalAnswers: answers.length,
    };
  },
});

export const toggleResults = mutation({
  args: { sessionId: v.id("pollSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Poll session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);

    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `poll:toggle:${args.sessionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    await ctx.db.patch(args.sessionId, {
      showResults: !session.showResults,
    });
  },
});

export const closePoll = mutation({
  args: { sessionId: v.id("pollSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Poll session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);

    const rl = await checkAndIncrementRateLimit(ctx, teacher._id, `poll:close:${args.sessionId}` as any, 5 * 60 * 1000, 60);
    if (!rl.allowed) throw new Error("Rate limited. Please wait a moment and try again.");

    await ctx.db.patch(args.sessionId, {
      closedAt: Date.now(),
    });
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("pollSessions") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Poll session not found");
    await requireTeacherOwnsSection(ctx, session.sectionId as Id<"sections">, teacher._id);

    await ctx.db.patch(args.sessionId, {
      instructorLastSeenAt: Date.now(),
    });
  },
});
