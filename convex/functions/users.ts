import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireCurrentUser, requireTeacher } from "./_auth";

export const get = query({
  args: { id: v.id("users"), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Only allow fetching your own user via this generic endpoint
    const currentUser = await requireCurrentUser(ctx, args.demoUserEmail);
    if (currentUser._id !== args.id) throw new Error("Forbidden");
    return await ctx.db.get(args.id);
  },
});

export const getByEmail = query({
  args: { email: v.string(), demoUserEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const clean = args.email.toLowerCase().trim();
    // Only allow self-lookup by email
    const currentUser = await requireCurrentUser(ctx, args.demoUserEmail);
    if ((currentUser.email || "").toLowerCase().trim() !== clean) throw new Error("Forbidden");
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", clean))
      .first();
  },
});

// Lock down direct creates; normal flow uses auth.upsertCurrentUser
export const create = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(v.literal("TEACHER"), v.literal("STUDENT")),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only teachers (instructor console) can create users explicitly
    await requireTeacher(ctx, args.demoUserEmail);
    return await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
    });
  },
});

export const list = query({
  args: {
    role: v.optional(v.union(v.literal("TEACHER"), v.literal("STUDENT"))),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Teachers may list students; students may not list users
    const teacher = await requireTeacher(ctx, args.demoUserEmail);
    if (args.role) {
      const role = args.role;
      return await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", role))
        .collect();
    }
    // Avoid full table scans: default to listing only students for teachers
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "STUDENT"))
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    demoUserEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only allow self-updates for basic fields.
    const currentUser = await requireCurrentUser(ctx, args.demoUserEmail);
    if (currentUser._id !== args.id) throw new Error("Forbidden");
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});
