import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { isDemoMode, requireTeacher, requireTeacherOwnsSection, requireStudent } from "./_auth";

export const create = mutation({
  args: {
    sectionId: v.id("sections"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (isDemoMode()) {
      const section = await ctx.db.get(args.sectionId);
      if (!section) throw new Error("Forbidden");
    } else {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    }
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
    if (isDemoMode()) {
      const section = await ctx.db.get(args.sectionId);
      if (!section) throw new Error("Forbidden");
    } else {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    }
    return await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
  },
});

export const getByStudent = query({
  args: { studentId: v.id("users"), includeRemoved: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (isDemoMode()) {
      const targetStudent = await ctx.db.get(args.studentId);
      if (!targetStudent || targetStudent.role !== "STUDENT") throw new Error("Forbidden");
    } else {
      const currentStudent = await requireStudent(ctx);
      if (currentStudent._id !== args.studentId) throw new Error("Forbidden");
    }
    const rows = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    if (args.includeRemoved) return rows;
    return rows.filter((e) => e.removedAt === undefined);
  },
});

export const remove = mutation({
  args: {
    sectionId: v.id("sections"),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (isDemoMode()) {
      const section = await ctx.db.get(args.sectionId);
      if (!section) throw new Error("Forbidden");
    } else {
      const teacher = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    }
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

export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const student = await requireStudent(ctx);
    const code = (args.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return { ok: false as const, error: "Enter a 6-digit join code." };
    }
    const section = await ctx.db
      .query("sections")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", code))
      .first();
    if (!section) {
      return { ok: false as const, error: "No course matches that join code." };
    }
    // Check if already enrolled
    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_section_student", (q) => q.eq("sectionId", section._id as Id<'sections'>).eq("studentId", student._id))
      .first();
    if (existing) {
      // If soft-removed, resurrect
      if ((existing as any).removedAt) {
        await ctx.db.patch(existing._id, { removedAt: undefined });
      }
      return { ok: true as const, sectionId: section._id };
    }
    const enrollmentId = await ctx.db.insert("enrollments", {
      sectionId: section._id as Id<'sections'>,
      studentId: student._id,
      createdAt: Date.now(),
    });
    return { ok: true as const, sectionId: section._id, enrollmentId };
  }
});
