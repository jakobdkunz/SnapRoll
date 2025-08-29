import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function requireCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const email = (identity.email ?? identity.tokenIdentifier ?? "").toString().trim().toLowerCase();
  if (!email) throw new Error("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (!user) throw new Error("User not provisioned");
  return user as { _id: Id<'users'>; role: "TEACHER" | "STUDENT" };
}

export const get = query({
  args: { id: v.id("sections") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    // Allow teachers to fetch their own section; students should not fetch arbitrary sections yet
    const section = await ctx.db.get(args.id);
    if (!section) return null;
    if (user.role === "TEACHER" && section.teacherId === user._id) return section;
    // For now, deny others (we can expand to enrolled students later)
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
    return await ctx.db.insert("sections", {
      title: args.title,
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
    return await ctx.db.patch(id, updates);
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
