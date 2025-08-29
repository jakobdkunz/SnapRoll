import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireStudentEnrollment, requireTeacher, requireTeacherOwnsSection } from "./_auth";

export const getActiveInteractive = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    // Only allow the student themselves to query their active interactive
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) throw new Error("Unauthenticated");
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!currentUser || currentUser._id !== args.studentId) throw new Error("Forbidden");
    // Get student's enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const sectionIds = enrollments.map(e => e.sectionId);

    const now = Date.now();
    const STALE_MS = 30 * 1000; // consider sessions stale if no heartbeat for 30s

    // fetch all active sessions across types
    const wordClouds = await ctx.db
      .query("wordCloudSessions")
      .filter((q) => q.and(
        q.eq(q.field("closedAt"), undefined),
        q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id)))
      ))
      .collect();

    const polls = await ctx.db
      .query("pollSessions")
      .filter((q) => q.and(
        q.eq(q.field("closedAt"), undefined),
        q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id)))
      ))
      .collect();

    const slideshows = await ctx.db
      .query("slideshowSessions")
      .filter((q) => q.and(
        q.eq(q.field("closedAt"), undefined),
        q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id)))
      ))
      .collect();

    type AnySession = { _id: Id<any>; sectionId: Id<"sections">; createdAt: number; instructorLastSeenAt?: number } & Record<string, any>;
    const toLastSeen = (s: AnySession) => (s.instructorLastSeenAt ?? s.createdAt);
    const notStale = (s: AnySession) => (now - toLastSeen(s)) <= STALE_MS;

    const candidates: Array<{ kind: 'wordcloud'|'poll'|'slideshow'; session: AnySession }> = [];
    for (const wc of wordClouds) if (notStale(wc)) candidates.push({ kind: 'wordcloud', session: wc as AnySession });
    for (const p of polls) if (notStale(p)) candidates.push({ kind: 'poll', session: p as AnySession });
    for (const ss of slideshows) if (notStale(ss)) candidates.push({ kind: 'slideshow', session: ss as AnySession });

    if (candidates.length === 0) return null;

    // pick the freshest by lastSeen, then createdAt as tie-breaker
    candidates.sort((a, b) => {
      const la = toLastSeen(a.session);
      const lb = toLastSeen(b.session);
      if (lb !== la) return lb - la;
      return (b.session.createdAt || 0) - (a.session.createdAt || 0);
    });

    const top = candidates[0];
    if (top.kind === 'wordcloud') {
      return {
        kind: 'wordcloud' as const,
        sessionId: top.session._id,
        prompt: top.session.prompt,
        showPromptToStudents: top.session.showPromptToStudents,
        allowMultipleAnswers: top.session.allowMultipleAnswers,
        sectionId: top.session.sectionId,
      };
    }
    if (top.kind === 'poll') {
      return {
        kind: 'poll' as const,
        sessionId: top.session._id,
        prompt: top.session.prompt,
        options: JSON.parse(top.session.optionsJson),
        showResults: top.session.showResults,
        sectionId: top.session.sectionId,
      };
    }
    return {
      kind: 'slideshow' as const,
      sessionId: top.session._id,
      currentSlide: top.session.currentSlide,
      showOnDevices: top.session.showOnDevices,
      sectionId: top.session.sectionId,
    };
  },
});
