import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const getActiveInteractive = query({
  args: { studentId: v.id("users"), tick: v.optional(v.number()) },
  handler: async (ctx, args) => {
    try {
    // Only allow the student themselves to query their active interactive.
    // Be defensive: on any auth mismatch, return null instead of throwing to avoid crashing the client UI.
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) return null;
    // Authorize: ensure the provided studentId matches the caller's identity email
    const currentUser = await ctx.db.get(args.studentId);
    if (!currentUser) return null;
    if ((currentUser.email || "").toString().trim().toLowerCase() !== email) return null;
    // Get student's enrollments
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const sectionIds = enrollments.map(e => e.sectionId);
    // If the student isn't enrolled in any sections, there can't be any activities
    if (sectionIds.length === 0) return null;

    const now = Date.now();
    const STALE_MS = 30 * 1000; // consider sessions stale if no heartbeat for 30s

    // fetch all active sessions across types using typed per-table loops
    const wordClouds = await (async () => {
      const all: Array<{ _id: Id<"wordCloudSessions">; sectionId: Id<"sections">; createdAt: number; instructorLastSeenAt?: number } & Record<string, unknown>> = [];
      for (const sid of sectionIds) {
        const rows = await ctx.db
          .query("wordCloudSessions")
          .withIndex("by_section_active", (q) => q.eq("sectionId", sid).eq("closedAt", undefined))
          .collect();
        all.push(...rows);
      }
      return all;
    })();

    const polls = await (async () => {
      const all: Array<{ _id: Id<"pollSessions">; sectionId: Id<"sections">; createdAt: number; instructorLastSeenAt?: number } & Record<string, unknown>> = [];
      for (const sid of sectionIds) {
        const rows = await ctx.db
          .query("pollSessions")
          .withIndex("by_section_active", (q) => q.eq("sectionId", sid).eq("closedAt", undefined))
          .collect();
        all.push(...rows);
      }
      return all;
    })();

    const slideshows = await (async () => {
      const all: Array<{ _id: Id<"slideshowSessions">; sectionId: Id<"sections">; assetId: Id<"slideshowAssets">; showOnDevices: boolean; createdAt: number; instructorLastSeenAt?: number } & Record<string, unknown>> = [];
      for (const sid of sectionIds) {
        const rows = await ctx.db
          .query("slideshowSessions")
          .withIndex("by_section_active", (q) => q.eq("sectionId", sid).eq("closedAt", undefined))
          .collect();
        all.push(...rows as any);
      }
      return all;
    })();

    type SessionTable = "wordCloudSessions" | "pollSessions" | "slideshowSessions";
    type AnySession = { _id: Id<SessionTable>; sectionId: Id<"sections">; createdAt: number; instructorLastSeenAt?: number } & Record<string, unknown>;
    const toLastSeen = (s: AnySession) => (s.instructorLastSeenAt ?? s.createdAt);
    const notStale = (s: AnySession) => (now - toLastSeen(s)) <= STALE_MS;

    const candidates: Array<{ kind: 'wordcloud'|'poll'|'slideshow'; session: AnySession }> = [];
    for (const wc of wordClouds) if (notStale(wc)) candidates.push({ kind: 'wordcloud', session: wc as AnySession });
    for (const p of polls) if (notStale(p)) candidates.push({ kind: 'poll', session: p as AnySession });
    for (const ss of slideshows) {
      if (!notStale(ss)) continue;
      // Gate visibility until instructor opts to show and rendering is ready
      if ((ss as any).showOnDevices !== true) continue;
      // Determine readiness: if asset.totalSlides is known, require that many slides uploaded; otherwise require at least one slide
      const asset = await ctx.db.get((ss as any).assetId as Id<'slideshowAssets'>);
      const firstSlide = await ctx.db
        .query('slideshowSlides')
        .withIndex('by_session', (q) => q.eq('sessionId', ss._id as unknown as Id<'slideshowSessions'>))
        .first();
      if (!firstSlide) continue; // no slides yet
      const totalSlides = (asset as any)?.totalSlides as number | undefined;
      if (typeof totalSlides === 'number' && totalSlides > 0) {
        const allSlides = await ctx.db
          .query('slideshowSlides')
          .withIndex('by_session', (q) => q.eq('sessionId', ss._id as unknown as Id<'slideshowSessions'>))
          .collect();
        if (allSlides.length < totalSlides) continue;
      }
      candidates.push({ kind: 'slideshow', session: ss as AnySession });
    }

    if (candidates.length === 0) return null;

    // Prioritize the newest activity by createdAt first (overwrite behavior),
    // then use recency of heartbeat as a tie-breaker.
    candidates.sort((a, b) => {
      const ca = (a.session.createdAt || 0);
      const cb = (b.session.createdAt || 0);
      if (cb !== ca) return cb - ca;
      const la = toLastSeen(a.session);
      const lb = toLastSeen(b.session);
      return lb - la;
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
      const pollSession = top.session as unknown as { prompt?: unknown; optionsJson?: unknown; showResults: boolean; sectionId: Id<'sections'>; _id: Id<'pollSessions'> };
      let options: string[] = [];
      try {
        options = JSON.parse(String(pollSession.optionsJson ?? '[]')) as string[];
      } catch {
        options = [];
      }
      return {
        kind: 'poll' as const,
        sessionId: pollSession._id,
        prompt: String(pollSession.prompt || ''),
        options,
        showResults: pollSession.showResults,
        sectionId: pollSession.sectionId,
      };
    }
    return {
      kind: 'slideshow' as const,
      sessionId: top.session._id,
      currentSlide: top.session.currentSlide,
      showOnDevices: top.session.showOnDevices,
      sectionId: top.session.sectionId,
    };
    } catch (err) {
      console.error('students.getActiveInteractive error', err);
      return null;
    }
  },
});
