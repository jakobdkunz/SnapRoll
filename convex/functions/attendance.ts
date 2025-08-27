import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getClassDay = query({
  args: { 
    sectionId: v.id("sections"),
    date: v.number() // Unix timestamp for start of day
  },
  handler: async (ctx, args) => {
    const startOfDay = args.date;
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000; // Next day
    
    return await ctx.db
      .query("classDays")
      .withIndex("by_section_date", (q) => 
        q.eq("sectionId", args.sectionId)
         .gte("date", startOfDay)
         .lt("date", endOfDay)
      )
      .first();
  },
});

export const createClassDay = mutation({
  args: {
    sectionId: v.id("sections"),
    date: v.number(),
    attendanceCode: v.string(),
    attendanceCodeExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("classDays", {
      sectionId: args.sectionId,
      date: args.date,
      attendanceCode: args.attendanceCode,
      attendanceCodeExpiresAt: args.attendanceCodeExpiresAt,
    });
  },
});

export const checkIn = mutation({
  args: {
    attendanceCode: v.string(),
    studentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find the class day with this attendance code
    const classDay = await ctx.db
      .query("classDays")
      .withIndex("by_attendance_code", (q) => q.eq("attendanceCode", args.attendanceCode))
      .first();
    
    if (!classDay) {
      throw new Error("Invalid attendance code");
    }
    
    if (classDay.attendanceCodeExpiresAt && classDay.attendanceCodeExpiresAt < now) {
      throw new Error("Attendance code has expired");
    }
    
    // Check if student is enrolled
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_section_student", (q) => 
        q.eq("sectionId", classDay.sectionId).eq("studentId", args.studentId)
      )
      .first();
    
    if (!enrollment) {
      throw new Error("Student not enrolled in this section");
    }
    
    // Check if attendance record already exists
    const existingRecord = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_classDay_student", (q) => 
        q.eq("classDayId", classDay._id).eq("studentId", args.studentId)
      )
      .first();
    
    if (existingRecord) {
      // Update existing record
      await ctx.db.patch(existingRecord._id, { status: "PRESENT" });
      return existingRecord._id;
    } else {
      // Create new record
      return await ctx.db.insert("attendanceRecords", {
        classDayId: classDay._id,
        studentId: args.studentId,
        status: "PRESENT",
      });
    }
  },
});

export const getAttendanceStatus = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const classDay = await ctx.db
      .query("classDays")
      .withIndex("by_section_date", (q) => 
        q.eq("sectionId", args.sectionId)
         .gte("date", startOfDay.getTime())
         .lt("date", endOfDay.getTime())
      )
      .first();
    
    if (!classDay) {
      return {
        hasActiveAttendance: false,
        totalStudents: 0,
        checkedIn: 0,
        progress: 0,
        attendanceCode: null,
      };
    }
    
    // Get total enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
    
    const totalStudents = enrollments.length;
    
    // Get checked in students
    const attendanceRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_classDay", (q) => q.eq("classDayId", classDay._id))
      .collect();
    
    const checkedIn = attendanceRecords.filter(record => record.status === "PRESENT").length;
    const progress = totalStudents > 0 ? Math.round((checkedIn / totalStudents) * 100) : 0;
    
    return {
      hasActiveAttendance: true,
      totalStudents,
      checkedIn,
      progress,
      attendanceCode: classDay.attendanceCode,
    };
  },
});

export const getAttendanceRecords = query({
  args: { classDayId: v.id("classDays") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attendanceRecords")
      .withIndex("by_classDay", (q) => q.eq("classDayId", args.classDayId))
      .collect();
  },
});
