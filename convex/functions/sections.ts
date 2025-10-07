import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const email = (identity.email ?? identity.tokenIdentifier ?? "").toString().trim().toLowerCase();
  if (!email) throw new Error("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (!user) throw new Error("User not provisioned");
  return user as { _id: Id<'users'>; role: "TEACHER" | "STUDENT" };
}

export const get = query({
  args: { id: v.id("sections") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    // Allow teachers to fetch their own section; allow students if enrolled
    const section = await ctx.db.get(args.id);
    if (!section) return null;
    if (user.role === "TEACHER" && section.teacherId === user._id) return section;
    if (user.role === "STUDENT") {
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_section_student", (q) => q.eq("sectionId", args.id).eq("studentId", user._id))
        .first();
      if (enrollment) return section;
    }
    throw new Error("Forbidden");
  },
});

export const getByTeacher = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER" || user._id !== args.teacherId) throw new Error("Forbidden");
    return await ctx.db
      .query("sections")
      .withIndex("by_teacher", (q) => q.eq("teacherId", args.teacherId))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    gradient: v.optional(v.string()),
    permittedAbsences: v.optional(v.number()),
    attendanceCheckinPoints: v.optional(v.number()),
    participationCreditPointsPossible: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    const title = (args.title || "").trim();
    if (title.length === 0 || title.length > 200) throw new Error("Title must be 1-200 chars");
    async function generateUniqueJoinCode(): Promise<string> {
      let attempts = 0;
      while (attempts < 60) {
        const n = Math.floor(Math.random() * 1000000);
        const candidate = String(n).padStart(6, '0');
        const existing = await ctx.db
          .query("sections")
          .withIndex("by_joinCode", (q) => q.eq("joinCode", candidate))
          .first();
        if (!existing) return candidate;
        attempts++;
      }
      throw new Error("Failed to generate join code. Please try again.");
    }
    const joinCode = await generateUniqueJoinCode();

    return await ctx.db.insert("sections", {
      title,
      gradient: args.gradient ?? "gradient-1",
      teacherId: user._id,
      joinCode,
      permittedAbsences: args.permittedAbsences,
      attendanceCheckinPoints: typeof args.attendanceCheckinPoints === 'number' ? Math.max(0, Math.floor(args.attendanceCheckinPoints)) : undefined,
      participationCreditPointsPossible: typeof args.participationCreditPointsPossible === 'number' ? Math.max(0, Math.floor(args.participationCreditPointsPossible)) : undefined,
    });
  },
});

export const backfillJoinCodesForTeacher = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    async function generateUniqueJoinCode(): Promise<string> {
      let attempts = 0;
      while (attempts < 60) {
        const n = Math.floor(Math.random() * 1000000);
        const candidate = String(n).padStart(6, '0');
        const existing = await ctx.db
          .query("sections")
          .withIndex("by_joinCode", (q) => q.eq("joinCode", candidate))
          .first();
        if (!existing) return candidate;
        attempts++;
      }
      throw new Error("Failed to generate join code.");
    }
    const teacherSections = await ctx.db
      .query("sections")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id as Id<'users'>))
      .collect();
    let updated = 0;
    for (const s of teacherSections) {
      const hasCode = typeof (s as { joinCode?: unknown }).joinCode === 'string' && ((s as { joinCode?: string }).joinCode || '').length > 0;
      if (!hasCode) {
        const code = await generateUniqueJoinCode();
        await ctx.db.patch(s._id as Id<'sections'>, { joinCode: code });
        updated++;
      }
    }
    return { ok: true as const, updated };
  }
});

export const list = query({
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    return await ctx.db
      .query("sections")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("sections"),
    title: v.optional(v.string()),
    gradient: v.optional(v.string()),
    permittedAbsences: v.optional(v.number()),
    clearPermittedAbsences: v.optional(v.boolean()),
    attendanceCheckinPoints: v.optional(v.number()),
    participationCreditPointsPossible: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    const { id, ...updates } = args;
    const section = await ctx.db.get(id);
    if (!section || section.teacherId !== user._id) throw new Error("Forbidden");
    const safe: { title?: string; gradient?: string; permittedAbsences?: number; attendanceCheckinPoints?: number; participationCreditPointsPossible?: number } = {};
    if (updates.title !== undefined) {
      const t = (updates.title || "").trim();
      if (t.length === 0 || t.length > 200) throw new Error("Title must be 1-200 chars");
      safe.title = t;
    }
    if (updates.gradient !== undefined) {
      const g = (updates.gradient || "").trim();
      if (g.length === 0 || g.length > 100) throw new Error("Invalid gradient");
      safe.gradient = g;
    }
    if (updates.permittedAbsences !== undefined) {
      const n = Number(updates.permittedAbsences);
      if (!Number.isFinite(n) || n < 0 || n > 60) throw new Error("Permitted absences must be 0-60");
      safe.permittedAbsences = Math.floor(n);
    }
    if (updates.attendanceCheckinPoints !== undefined) {
      const n = Number(updates.attendanceCheckinPoints);
      if (!Number.isFinite(n) || n < 0 || n > 10000) throw new Error("Attendance points must be 0-10000");
      safe.attendanceCheckinPoints = Math.floor(n);
    }
    if (updates.participationCreditPointsPossible !== undefined) {
      const n = Number(updates.participationCreditPointsPossible);
      if (!Number.isFinite(n) || n < 0 || n > 10000) throw new Error("Participation credit points must be 0-10000");
      safe.participationCreditPointsPossible = Math.floor(n);
    }
    // If explicitly clearing, unset the optional field
    if (args.clearPermittedAbsences) {
      const patchAny: any = { ...safe, permittedAbsences: undefined };
      return await ctx.db.patch(id, patchAny);
    }
    return await ctx.db.patch(id, safe);
  },
});

export const deleteSection = mutation({
  args: { id: v.id("sections") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    const section = await ctx.db.get(args.id);
    if (!section || section.teacherId !== user._id) throw new Error("Forbidden");
    return await ctx.db.delete(args.id);
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("sections")) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    const sections = docs.filter(Boolean) as Array<{ _id: Id<'sections'>; teacherId: Id<'users'>; title: string; gradient?: string; permittedAbsences?: number | null }>;
    if (user.role === "TEACHER") {
      return sections.filter((s) => s.teacherId === user._id);
    }
    // Student: return only sections where the student is enrolled
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();
    const allowed = new Set(enrollments.map((e) => e.sectionId));
    return sections.filter((s) => allowed.has(s._id));
  },
});

// Return section details including instructor info for authorized student
export const getDetailsByIds = query({
  args: { ids: v.array(v.id("sections")) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    const sections = (docs.filter(Boolean) as Array<{
      _id: Id<'sections'>;
      title: string;
      gradient?: string;
      teacherId: Id<'users'>;
      permittedAbsences?: number | null;
    }>);

    if (user.role === "TEACHER") {
      // Teachers can only view their own sections
      const own = sections.filter((s) => s.teacherId === user._id);
      const teacher = await ctx.db.get(user._id as Id<'users'>);
      return own.map((s) => ({
        id: s._id,
        title: s.title,
        gradient: s.gradient ?? "gradient-1",
        permittedAbsences: s.permittedAbsences ?? null,
        teacher: teacher
          ? { id: teacher._id as Id<'users'>, firstName: teacher.firstName as string, lastName: teacher.lastName as string, email: teacher.email as string }
          : { id: user._id, firstName: "", lastName: "", email: "" },
      }));
    }

    // Student: return only sections where the student is enrolled
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();
    const allowed = new Set(enrollments.map((e) => e.sectionId));
    const filtered = sections.filter((s) => allowed.has(s._id));
    // Fetch instructor docs
    const teacherIds = Array.from(new Set(filtered.map((s) => s.teacherId)));
    const teacherDocs = await Promise.all(teacherIds.map((id) => ctx.db.get(id)));
    const teacherById = new Map<Id<'users'>, { firstName: string; lastName: string; email: string }>();
    for (const t of teacherDocs) {
      if (!t) continue;
      teacherById.set(t._id as Id<'users'>, {
        firstName: (t.firstName as string) || "",
        lastName: (t.lastName as string) || "",
        email: (t.email as string) || "",
      });
    }

    return filtered.map((s) => ({
      id: s._id,
      title: s.title,
      gradient: s.gradient ?? "gradient-1",
      permittedAbsences: s.permittedAbsences ?? null,
      teacher: {
        id: s.teacherId,
        firstName: teacherById.get(s.teacherId)?.firstName || "",
        lastName: teacherById.get(s.teacherId)?.lastName || "",
        email: teacherById.get(s.teacherId)?.email || "",
      },
    }));
  },
});
