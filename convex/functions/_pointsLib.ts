import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Ensure a points opportunity exists for an attendance class day and return its id.
 */
export async function ensureAttendanceOpportunity(
  ctx: MutationCtx,
  params: { sectionId: Id<'sections'>; classDayId: Id<'classDays'>; points: number; sourceDate?: number }
): Promise<Id<'pointsOpportunities'>> {
  const targetId = String(params.classDayId);
  const existing = await ctx.db
    .query("pointsOpportunities")
    .withIndex("by_kind_target", (q) => q.eq("kind", "attendance").eq("targetId", targetId))
    .first();
  if (existing) {
    // Keep points if previously set; allow update if changed by instructor later elsewhere
    return existing._id as Id<'pointsOpportunities'>;
  }
  const id = await ctx.db.insert("pointsOpportunities", {
    sectionId: params.sectionId,
    kind: "attendance" as const,
    targetId,
    sourceDate: params.sourceDate,
    points: Math.max(0, Math.floor(params.points || 0)),
    createdAt: Date.now(),
    undone: false,
  });
  return id as Id<'pointsOpportunities'>;
}

/** Ensure a points opportunity exists for a poll/wordcloud session */
export async function ensureSessionOpportunity(
  ctx: MutationCtx,
  params: { sectionId: Id<'sections'>; sessionId: Id<'pollSessions'> | Id<'wordCloudSessions'>; kind: 'poll' | 'wordcloud'; points: number }
): Promise<Id<'pointsOpportunities'>> {
  const targetId = String(params.sessionId);
  const existing = await ctx.db
    .query("pointsOpportunities")
    .withIndex("by_kind_target", (q) => q.eq("kind", params.kind).eq("targetId", targetId))
    .first();
  if (existing) return existing._id as Id<'pointsOpportunities'>;
  const id = await ctx.db.insert("pointsOpportunities", {
    sectionId: params.sectionId,
    kind: params.kind,
    targetId,
    points: Math.max(0, Math.floor(params.points || 0)),
    createdAt: Date.now(),
    undone: false,
  });
  return id as Id<'pointsOpportunities'>;
}

/** Assign a student points for an opportunity if not already assigned */
export async function assignIfNeeded(
  ctx: MutationCtx,
  params: { opportunityId: Id<'pointsOpportunities'>; sectionId: Id<'sections'>; studentId: Id<'users'> }
): Promise<boolean> {
  const existing = await ctx.db
    .query("pointsAssignments")
    .withIndex("by_section_student", (q) => q.eq("sectionId", params.sectionId).eq("studentId", params.studentId))
    .collect();
  // Quick membership check for this opportunity
  if (existing.some((a) => a.opportunityId === params.opportunityId)) return false;
  await ctx.db.insert("pointsAssignments", {
    opportunityId: params.opportunityId,
    sectionId: params.sectionId,
    studentId: params.studentId,
    createdAt: Date.now(),
  });
  return true;
}





