import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection } from "./_auth";

export const create = mutation({
  args: {
    sectionId: v.id("sections"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    // Check if enrollment already exists
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_section_student", (q) => 
        q.eq("sectionId", args.sectionId).eq("studentId", args.studentId)
      )
      .first();
    
    if (existing) {
      // If previously removed, resurrect by clearing removedAt
      if ((existing as any).removedAt) {
        await ctx.db.patch(existing._id, { removedAt: undefined });
      }
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
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    return await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
  },
});

export const getByStudent = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    // Allow teacher access only to students enrolled in their sections via other endpoints.
    // Here we restrict to the student themselves.
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) throw new Error("Unauthenticated");
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!currentUser) throw new Error("Unauthenticated");
    if (currentUser._id !== args.studentId) throw new Error("Forbidden");
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
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_section_student", (q) => 
        q.eq("sectionId", args.sectionId).eq("studentId", args.studentId)
      )
      .first();
    
    if (enrollment) {
      // Soft-remove to keep history; mark removedAt
      await ctx.db.patch(enrollment._id, { removedAt: Date.now() });
    }
  },
});
