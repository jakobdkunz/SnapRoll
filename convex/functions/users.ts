import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireTeacher } from "./_auth";

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    // Only allow fetching your own user via this generic endpoint
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) throw new Error("Unauthenticated");
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!currentUser) throw new Error("Unauthenticated");
    if (currentUser._id !== args.id) throw new Error("Forbidden");
    return currentUser;
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Only allow self-lookup by email
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) throw new Error("Unauthenticated");
    if (email !== args.email.toLowerCase().trim()) throw new Error("Forbidden");
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
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
  },
  handler: async (ctx, args) => {
    // Only teachers (instructor console) can create users explicitly
    await requireTeacher(ctx);
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
  },
  handler: async (ctx, args) => {
    // Teachers may list students; students may not list users
    const teacher = await requireTeacher(ctx);
    if (args.role) {
      const role = args.role;
      return await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", role))
        .collect();
    }
    return await ctx.db.query("users").collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only allow self-updates for basic fields
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) throw new Error("Unauthenticated");
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!currentUser) throw new Error("Unauthenticated");
    if (currentUser._id !== args.id) throw new Error("Forbidden");
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});
