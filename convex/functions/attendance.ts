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

export const updateManualStatus = mutation({
  args: {
    classDayId: v.id("classDays"),
    studentId: v.id("users"),
    status: v.union(
      v.literal("PRESENT"),
      v.literal("ABSENT"),
      v.literal("EXCUSED"),
      v.literal("NOT_JOINED"),
      v.literal("BLANK")
    ),
    teacherId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if status is BLANK - only allow if original status was BLANK
    if (args.status === "BLANK") {
      const originalRecord = await ctx.db
        .query("attendanceRecords")
        .withIndex("by_classDay_student", (q) => 
          q.eq("classDayId", args.classDayId).eq("studentId", args.studentId)
        )
        .first();
      
      if (originalRecord && originalRecord.status !== "BLANK") {
        throw new Error("Cannot change to BLANK unless original status was BLANK");
      }
    }

    // Check if manual change already exists
    const existingManualChange = await ctx.db
      .query("manualStatusChanges")
      .withIndex("by_classDay_student", (q) => 
        q.eq("classDayId", args.classDayId).eq("studentId", args.studentId)
      )
      .first();
    
    if (existingManualChange) {
      // Update existing manual change
      await ctx.db.patch(existingManualChange._id, {
        status: args.status,
        teacherId: args.teacherId,
        createdAt: Date.now(),
      });
      return existingManualChange._id;
    } else {
      // Create new manual change
      return await ctx.db.insert("manualStatusChanges", {
        classDayId: args.classDayId,
        studentId: args.studentId,
        status: args.status,
        teacherId: args.teacherId,
        createdAt: Date.now(),
      });
    }
  },
});

export const getManualStatusChanges = query({
  args: { classDayId: v.id("classDays") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("manualStatusChanges")
      .withIndex("by_classDay", (q) => q.eq("classDayId", args.classDayId))
      .collect();
  },
});

export const startAttendance = mutation({
  args: {
    sectionId: v.id("sections"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    // Check if attendance already exists for today
    const existingClassDay = await ctx.db
      .query("classDays")
      .withIndex("by_section_date", (q) => 
        q.eq("sectionId", args.sectionId)
         .gte("date", startOfDay.getTime())
         .lt("date", endOfDay.getTime())
      )
      .first();
    
    if (existingClassDay) {
      return existingClassDay;
    }
    
    // Generate a random 4-digit code
    const attendanceCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now
    
    return await ctx.db.insert("classDays", {
      sectionId: args.sectionId,
      date: startOfDay.getTime(),
      attendanceCode,
      attendanceCodeExpiresAt: expiresAt,
    });
  },
});
