import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireStudentEnrollment, requireCurrentUser } from "./_auth";
import { checkAndIncrementRateLimit } from "./_rateLimit";
import { ensureSessionOpportunity, assignIfNeeded } from "./_pointsLib";

export const startPoll = mutation({
  args: {
    sectionId: v.id("sections"),
    prompt: v.string(),
    options: v.array(v.string()),
    showResults: v.optional(v.boolean()),
    points: v.optional(v.number()),
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

    // If another active poll exists for this section, close it first to avoid duplicates
    const existing = await ctx.db
      .query("pollSessions")
      .withIndex("by_section_active", (q) => q.eq("sectionId", args.sectionId).eq("closedAt", undefined))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { closedAt: Date.now() });
    }
    const sessionId = await ctx.db.insert("pollSessions", {
      sectionId: args.sectionId,
      prompt,
      optionsJson: JSON.stringify(options),
      showResults: args.showResults ?? true,
      createdAt: Date.now(),
      points: typeof args.points === 'number' ? Math.max(0, Math.floor(args.points)) : undefined,
    });
    // Create a points opportunity for this session if points > 0
    if (typeof args.points === 'number' && args.points > 0) {
      await ensureSessionOpportunity(ctx, { sectionId: args.sectionId as Id<'sections'>, sessionId: sessionId as Id<'pollSessions'>, kind: 'poll', points: Math.floor(args.points) });
    }
    return sessionId;
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
      const ansId = await ctx.db.insert("pollAnswers", {
        sessionId: args.sessionId,
        studentId: callerId,
        optionIdx: args.optionIdx,
        createdAt: Date.now(),
      });
      // Award points if configured and opportunity exists, but only once per session
      const session = await ctx.db.get(args.sessionId);
      const pts = Number((session as any)?.points || 0);
      if (pts > 0) {
        const oppId = await ensureSessionOpportunity(ctx, { sectionId: session!.sectionId as Id<'sections'>, sessionId: args.sessionId, kind: 'poll', points: pts });
        await assignIfNeeded(ctx, { opportunityId: oppId, sectionId: session!.sectionId as Id<'sections'>, studentId: callerId });
      }
      return ansId;
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
    const now = Date.now();
    const last = (session.instructorLastSeenAt as number | undefined) ?? 0;
    if (now - last > 5000) {
      await ctx.db.patch(args.sessionId, { instructorLastSeenAt: now });
    }
  },
});
