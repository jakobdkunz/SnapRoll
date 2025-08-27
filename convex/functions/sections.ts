import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const get = query({
  args: { id: v.id("sections") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByTeacher = query({
  args: { teacherId: v.id("users") },
  handler: async (ctx, args) => {
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
    teacherId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sections", {
      title: args.title,
      gradient: args.gradient ?? "gradient-1",
      teacherId: args.teacherId,
    });
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("sections").collect();
  },
});
