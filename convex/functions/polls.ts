import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const startPoll = mutation({
  args: {
    sectionId: v.id("sections"),
    prompt: v.string(),
    options: v.array(v.string()),
    showResults: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pollSessions", {
      sectionId: args.sectionId,
      prompt: args.prompt,
      optionsJson: JSON.stringify(args.options),
      showResults: args.showResults ?? false,
      createdAt: Date.now(),
    });
  },
});

export const getActivePoll = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
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
    studentId: v.id("users"),
    optionIdx: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if student already answered
    const existingAnswer = await ctx.db
      .query("pollAnswers")
      .withIndex("by_session_student", (q) => 
        q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
      )
      .first();

    if (existingAnswer) {
      // Update existing answer
      await ctx.db.patch(existingAnswer._id, { 
        optionIdx: args.optionIdx,
        createdAt: Date.now(),
      });
      return existingAnswer._id;
    } else {
      // Create new answer
      return await ctx.db.insert("pollAnswers", {
        sessionId: args.sessionId,
        studentId: args.studentId,
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
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Poll session not found");

    await ctx.db.patch(args.sessionId, {
      showResults: !session.showResults,
    });
  },
});

export const closePoll = mutation({
  args: { sessionId: v.id("pollSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      closedAt: Date.now(),
    });
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("pollSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      instructorLastSeenAt: Date.now(),
    });
  },
});
