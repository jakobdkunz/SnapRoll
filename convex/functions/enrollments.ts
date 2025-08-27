import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const create = mutation({
  args: {
    sectionId: v.id("sections"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if enrollment already exists
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_section_student", (q) => 
        q.eq("sectionId", args.sectionId).eq("studentId", args.studentId)
      )
      .first();
    
    if (existing) {
      return existing._id; // Already enrolled
    }
    
    return await ctx.db.insert("enrollments", {
      sectionId: args.sectionId,
      studentId: args.studentId,
      createdAt: Date.now(),
    });
  },
});

export const getBySection = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
  },
});

export const getByStudent = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
  },
});

export const remove = mutation({
  args: {
    sectionId: v.id("sections"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_section_student", (q) => 
        q.eq("sectionId", args.sectionId).eq("studentId", args.studentId)
      )
      .first();
    
    if (enrollment) {
      await ctx.db.delete(enrollment._id);
    }
  },
});
