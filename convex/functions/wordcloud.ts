import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const startWordCloud = mutation({
  args: {
    sectionId: v.id("sections"),
    prompt: v.string(),
    showPromptToStudents: v.optional(v.boolean()),
    allowMultipleAnswers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
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
    studentId: v.id("users"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("WordCloud session not found");

    // Check if student already submitted this exact text
    const existingAnswer = await ctx.db
      .query("wordCloudAnswers")
      .withIndex("by_session_student_text", (q) => 
        q.eq("sessionId", args.sessionId)
         .eq("studentId", args.studentId)
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
          q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
        )
        .collect();

      if (existingAnswers.length > 0) {
        throw new Error("Multiple answers not allowed");
      }
    }

    return await ctx.db.insert("wordCloudAnswers", {
      sessionId: args.sessionId,
      studentId: args.studentId,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

export const getResults = query({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

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
    await ctx.db.patch(args.sessionId, {
      closedAt: Date.now(),
    });
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("wordCloudSessions") },
  handler: async (ctx, args) => {
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
