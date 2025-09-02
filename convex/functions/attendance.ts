import { v, ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type RateLimitBucket = {
  _id: Id<'rateLimits'>;
  userId: Id<'users'>;
  key: string;
  windowStart: number;
  count: number;
  blockedUntil?: number;
};

async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in to continue.");
  const email = (identity.email ?? identity.tokenIdentifier ?? "").toString().trim().toLowerCase();
  if (!email) throw new ConvexError("Please sign in to continue.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (!user) throw new ConvexError("Account not provisioned. Try refreshing or contact your instructor.");
  return user as { _id: Id<'users'>; role: "TEACHER" | "STUDENT" };
}

async function requireTeacherOwnsSection(ctx: QueryCtx | MutationCtx, sectionId: Id<'sections'>, teacherUserId: Id<'users'>) {
  const section = await ctx.db.get(sectionId);
  if (!section || section.teacherId !== teacherUserId) throw new Error("Forbidden");
  return section;
}

async function requireTeacherOwnershipForClassDay(ctx: QueryCtx | MutationCtx, classDayId: Id<'classDays'>, teacherUserId: Id<'users'>) {
  const classDay = await ctx.db.get(classDayId);
  if (!classDay) throw new Error("Not found");
  await requireTeacherOwnsSection(ctx, classDay.sectionId as Id<'sections'>, teacherUserId);
  return classDay;
}

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
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "STUDENT") throw new ConvexError("Only students can check in.");
    const studentId = user._id;
    const now = Date.now();
    // Rate limit: 6 attempts per 30 minutes; block for 30 minutes when exceeded
    const WINDOW_MS = 30 * 60 * 1000;
    const MAX_ATTEMPTS = 6;
    const BLOCK_MS = 30 * 60 * 1000;
    // Count attempts across all codes for this user
    const key = 'checkin:any';
    const buckets = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_key", (q) => q.eq("userId", studentId).eq("key", key))
      .order("desc")
      .collect() as RateLimitBucket[];
    // Choose the active bucket in the current window, if any
    let bucket: RateLimitBucket | null = buckets.find((b) => now - b.windowStart < WINDOW_MS) || null;
    // If any bucket is blocked, enforce block
    const blocked = buckets.find((b) => b.blockedUntil && b.blockedUntil > now);
    if (blocked) {
      return { ok: false, error: "Too many attempts. Please wait 30 minutes and try again.", attemptsLeft: 0, blockedUntil: blocked.blockedUntil };
    }
    // Create a window bucket if none exists yet (count will be incremented only on failures)
    if (!bucket) {
      const id = await ctx.db.insert("rateLimits", { userId: studentId, key, windowStart: now, count: 0, blockedUntil: undefined });
      bucket = await ctx.db.get(id) as RateLimitBucket;
    }
    
    // Find the class day with this attendance code
    const classDay = await ctx.db
      .query("classDays")
      .withIndex("by_attendance_code", (q) => q.eq("attendanceCode", args.attendanceCode))
      .first();
    
    if (!classDay) {
      const nextCount = bucket!.count + 1;
      const blockedUntil = nextCount > MAX_ATTEMPTS ? (now + BLOCK_MS) : undefined;
      await ctx.db.patch(bucket!._id, { count: nextCount, blockedUntil });
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - nextCount);
      return { ok: false, error: `Invalid code. Please check the code and try again. (${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining)`, attemptsLeft, blockedUntil };
    }
    
    if (classDay.attendanceCodeExpiresAt && classDay.attendanceCodeExpiresAt < now) {
      const nextCount = bucket!.count + 1;
      const blockedUntil = nextCount > MAX_ATTEMPTS ? (now + BLOCK_MS) : undefined;
      await ctx.db.patch(bucket!._id, { count: nextCount, blockedUntil });
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - nextCount);
      return { ok: false, error: "This code has expired. Ask your instructor for a new one.", attemptsLeft, blockedUntil };
    }
    
    // Check if student is enrolled
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_section_student", (q) => 
        q.eq("sectionId", classDay.sectionId).eq("studentId", studentId)
      )
      .first();
    
    if (!enrollment) {
      const nextCount = bucket!.count + 1;
      const blockedUntil = nextCount > MAX_ATTEMPTS ? (now + BLOCK_MS) : undefined;
      await ctx.db.patch(bucket!._id, { count: nextCount, blockedUntil });
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - nextCount);
      return { ok: false, error: "You’re not enrolled in this course. Ask your instructor to add you.", attemptsLeft, blockedUntil };
    }
    
    // Check if attendance record already exists
    const existingRecord = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_classDay_student", (q) => 
        q.eq("classDayId", classDay._id).eq("studentId", studentId)
      )
      .first();
    
    if (existingRecord) {
      // If already present, do not count as failure, do not reset counter
      if (existingRecord.status === "PRESENT") {
        return { ok: false, error: "You already checked in for this class.", attemptsLeft: Math.max(0, MAX_ATTEMPTS - bucket!.count) };
      }
      // Update existing record from other status to PRESENT (success)
      await ctx.db.patch(existingRecord._id, { status: "PRESENT" });
      // Clear any manual BLANK override so effective status reflects PRESENT
      const manual = await ctx.db
        .query("manualStatusChanges")
        .withIndex("by_classDay_student", (q) => 
          q.eq("classDayId", classDay._id).eq("studentId", studentId)
        )
        .first();
      if (manual && manual.status === "BLANK") {
        await ctx.db.delete(manual._id);
      }
      // Reset attempts on success
      await ctx.db.patch(bucket!._id, { count: 0, windowStart: now, blockedUntil: undefined });
      return { ok: true, recordId: existingRecord._id };
    } else {
      // Create new record (success)
      const id = await ctx.db.insert("attendanceRecords", {
        classDayId: classDay._id,
        studentId,
        status: "PRESENT",
      });
      // Clear any manual BLANK override so effective status reflects PRESENT
      const manual = await ctx.db
        .query("manualStatusChanges")
        .withIndex("by_classDay_student", (q) => 
          q.eq("classDayId", classDay._id).eq("studentId", studentId)
        )
        .first();
      if (manual && manual.status === "BLANK") {
        await ctx.db.delete(manual._id);
      }
      // Reset attempts on success
      await ctx.db.patch(bucket!._id, { count: 0, windowStart: now, blockedUntil: undefined });
      return { ok: true, recordId: id };
    }
  },
});

export const getAttendanceStatus = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    await requireTeacherOwnsSection(ctx, args.sectionId, user._id);
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
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    await requireTeacherOwnershipForClassDay(ctx, args.classDayId, user._id);
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
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    await requireTeacherOwnershipForClassDay(ctx, args.classDayId, user._id);
    // Setting BLANK should never create a manual change; treat as "revert"
    if (args.status === "BLANK") {
      const originalRecord = await ctx.db
        .query("attendanceRecords")
        .withIndex("by_classDay_student", (q) =>
          q.eq("classDayId", args.classDayId).eq("studentId", args.studentId)
        )
        .first();
      // If there is a recorded status that isn't BLANK, do not allow reverting to BLANK
      if (originalRecord && originalRecord.status !== "BLANK") {
        throw new Error("Cannot change to BLANK once a non-blank status is recorded");
      }
      // Remove any existing manual change so UI reflects unmodified BLANK
      const existing = await ctx.db
        .query("manualStatusChanges")
        .withIndex("by_classDay_student", (q) =>
          q.eq("classDayId", args.classDayId).eq("studentId", args.studentId)
        )
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
        return existing._id;
      }
      return null;
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
        teacherId: user._id,
        createdAt: Date.now(),
      });
      return existingManualChange._id;
    } else {
      // Create new manual change
      return await ctx.db.insert("manualStatusChanges", {
        classDayId: args.classDayId,
        studentId: args.studentId,
        status: args.status,
        teacherId: user._id,
        createdAt: Date.now(),
      });
    }
  },
});

export const getManualStatusChanges = query({
  args: { classDayId: v.id("classDays") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    await requireTeacherOwnershipForClassDay(ctx, args.classDayId, user._id);
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
    const user = await requireCurrentUser(ctx);
    if (user.role !== "TEACHER") throw new Error("Forbidden");
    await requireTeacherOwnsSection(ctx, args.sectionId, user._id);
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
      // Rotate the code on the existing class day
      const newCode = Math.floor(1000 + Math.random() * 9000).toString();
      const newExpiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now
      await ctx.db.patch(existingClassDay._id, {
        attendanceCode: newCode,
        attendanceCodeExpiresAt: newExpiresAt,
      });
      return existingClassDay;
    }
    
    // Create new class day with a fresh 4-digit code
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    const newExpiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now
    
    return await ctx.db.insert("classDays", {
      sectionId: args.sectionId,
      date: startOfDay.getTime(),
      attendanceCode: newCode,
      attendanceCodeExpiresAt: newExpiresAt,
    });
  },
});
