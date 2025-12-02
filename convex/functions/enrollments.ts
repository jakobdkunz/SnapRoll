import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireStudent } from "./_auth";

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
    const isDemoMode = process.env.DEMO_MODE === "true";
    
    if (isDemoMode) {
      // In demo mode, check if demo teacher exists first
      const demoEmail = "demo-teacher@example.com";
      const demoTeacher = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", demoEmail))
        .first();
      
      // If demo teacher doesn't exist yet, return empty array (frontend will create it)
      if (!demoTeacher) {
        return [];
      }
      
      // Verify section exists
      const section = await ctx.db.get(args.sectionId);
      if (!section) {
        return [];
      }
    } else {
      // Normal mode: use standard auth checks
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
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    // Allow teacher access only to students enrolled in their sections via other endpoints.
    // Here we restrict to the student themselves.
    const isDemoMode = process.env.DEMO_MODE === "true";
    
    let effectiveStudentId: Id<"users">;
    
    if (isDemoMode) {
      // In demo mode, use requireStudent to get the demo student
      // (This handles the case where getCurrentUser returns teacher but we need student)
      const student = await requireStudent(ctx);
      effectiveStudentId = student._id;
    } else {
      // Normal mode: use requireStudent and verify the requested studentId matches
      const student = await requireStudent(ctx);
      if (student._id !== args.studentId) throw new Error("Forbidden");
      effectiveStudentId = args.studentId;
    }
    
    return await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", effectiveStudentId))
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
