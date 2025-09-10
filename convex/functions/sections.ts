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
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    const title = (args.title || "").trim();
    if (title.length === 0 || title.length > 200) throw new Error("Title must be 1-200 chars");
    return await ctx.db.insert("sections", {
      title,
      gradient: args.gradient ?? "gradient-1",
      teacherId: user._id,
    });
  },
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
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    const { id, ...updates } = args;
    const section = await ctx.db.get(id);
    if (!section || section.teacherId !== user._id) throw new Error("Forbidden");
    const safe: { title?: string; gradient?: string } = {};
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
    const sections = docs.filter(Boolean) as Array<{ _id: Id<'sections'>; teacherId: Id<'users'>; title: string; gradient?: string }>;
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
