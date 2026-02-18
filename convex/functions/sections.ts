import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { isDemoMode, requireCurrentUser } from "./_auth";

export const get = query({
  args: { id: v.id("sections"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.id);
    if (!section) return null;
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
    // Allow teachers to fetch their own section; allow students if enrolled
    if (user.role === "TEACHER" && section.teacherId === user._id) return section;
    if (user.role === "STUDENT") {
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_section_student", (q) => q.eq("sectionId", args.id).eq("studentId", user._id))
        .first();
      if (enrollment && enrollment.removedAt === undefined) return section;
    }
    throw new Error("Forbidden");
  },
});

export const getAccessStatus = query({
  args: { id: v.string(), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const normalizedId = await ctx.db.normalizeId("sections", args.id);
    if (!normalizedId) return { status: "not_found" as const };

    const section = await ctx.db.get(normalizedId);
    if (!section) return { status: "not_found" as const };

    let user: Awaited<ReturnType<typeof requireCurrentUser>> | null = null;
    try {
      user = await requireCurrentUser(ctx, args.demoUserEmail);
    } catch {
      user = null;
    }
    if (!user) return { status: "forbidden" as const };

    if (user.role === "TEACHER" && section.teacherId === user._id) {
      return { status: "ok" as const, section };
    }
    if (user.role === "STUDENT") {
      const enrollment = await ctx.db
        .query("enrollments")
        .withIndex("by_section_student", (q) => q.eq("sectionId", normalizedId).eq("studentId", user._id))
        .first();
      if (enrollment && enrollment.removedAt === undefined) {
        return { status: "ok" as const, section };
      }
    }
    return { status: "forbidden" as const };
  },
});

export const getByTeacher = query({
  args: { teacherId: v.id("users"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
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
    permittedAbsencesMode: v.optional(v.union(v.literal("policy"), v.literal("custom"))),
    policyTimesPerWeek: v.optional(v.number()),
    policyDuration: v.optional(v.union(v.literal("semester"), v.literal("8week"))),
    participationCreditPointsPossible: v.optional(v.number()),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
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
      permittedAbsencesMode: args.permittedAbsencesMode,
      policyTimesPerWeek: args.policyTimesPerWeek,
      policyDuration: args.policyDuration,
      participationCreditPointsPossible: typeof args.participationCreditPointsPossible === 'number' ? Math.max(0, Math.floor(args.participationCreditPointsPossible)) : undefined,
    });
  },
});

export const backfillJoinCodesForTeacher = mutation({
  args: { demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
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
  args: { demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
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
    permittedAbsencesMode: v.optional(v.union(v.literal("policy"), v.literal("custom"))),
    policyTimesPerWeek: v.optional(v.number()),
    policyDuration: v.optional(v.union(v.literal("semester"), v.literal("8week"))),
    participationCreditPointsPossible: v.optional(v.number()),
    clearParticipation: v.optional(v.boolean()),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    const { id, ...updates } = args;
    const section = await ctx.db.get(id);
    if (!section || section.teacherId !== user._id) throw new Error("Forbidden");
    const safe: {
      title?: string;
      gradient?: string;
      permittedAbsences?: number;
      permittedAbsencesMode?: "policy" | "custom";
      policyTimesPerWeek?: number;
      policyDuration?: "semester" | "8week";
      participationCreditPointsPossible?: number;
    } = {};
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
    if (updates.permittedAbsencesMode !== undefined) {
      safe.permittedAbsencesMode = updates.permittedAbsencesMode;
    }
    if (updates.policyTimesPerWeek !== undefined) {
      const n = Number(updates.policyTimesPerWeek);
      if (!Number.isFinite(n) || n < 1 || n > 3) throw new Error("policyTimesPerWeek must be 1, 2, or 3");
      safe.policyTimesPerWeek = Math.floor(n);
    }
    if (updates.policyDuration !== undefined) {
      safe.policyDuration = updates.policyDuration;
    }
    if (updates.participationCreditPointsPossible !== undefined) {
      const n = Number(updates.participationCreditPointsPossible);
      if (!Number.isFinite(n) || n < 0 || n > 10000) throw new Error("Participation credit points must be 0-10000");
      safe.participationCreditPointsPossible = Math.floor(n);
    }
    // If explicitly clearing permitted absences, unset the optional field
    if (args.clearPermittedAbsences) {
      const patchAny: any = {
        ...safe,
        permittedAbsences: undefined,
        permittedAbsencesMode: undefined,
        policyTimesPerWeek: undefined,
        policyDuration: undefined,
      };
      return await ctx.db.patch(id, patchAny);
    }
    // If explicitly clearing participation config, unset both optional fields
    if (args.clearParticipation) {
      const patchAny: any = { ...safe, participationCreditPointsPossible: undefined };
      return await ctx.db.patch(id, patchAny);
    }
    return await ctx.db.patch(id, safe);
  },
});

export const deleteSection = mutation({
  args: { id: v.id("sections"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    const section = await ctx.db.get(args.id);
    if (!section || section.teacherId !== user._id) throw new Error("Forbidden");
    return await ctx.db.delete(args.id);
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("sections")), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
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
    const allowed = new Set(
      enrollments
        .filter((e) => e.removedAt === undefined)
        .map((e) => e.sectionId)
    );
    return sections.filter((s) => allowed.has(s._id));
  },
});

// Return section details including instructor info for authorized student
export const getDetailsByIds = query({
  args: { ids: v.array(v.id("sections")), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.demoUserEmail);
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
    const allowed = new Set(
      enrollments
        .filter((e) => e.removedAt === undefined)
        .map((e) => e.sectionId)
    );
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
