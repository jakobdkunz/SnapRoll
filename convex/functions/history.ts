import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection, requireStudentEnrollment } from "./_auth";

export const getSectionHistory = query({
  args: {
    sectionId: v.id("sections"),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Restrict to owner teacher
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<"sections">, teacher._id);
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    // Get all class days for this section, ordered by date desc
    const rawDays = await ctx.db
      .query("classDays")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .order("desc")
      .collect();

    // Deduplicate by LOCAL calendar day to avoid duplicate columns
    // Use local midnight key to align with how classDays.date is stored (startOfDay local time)
    const unique: typeof rawDays = [];
    const seen = new Set<number>();
    for (const cd of rawDays) {
      const d = new Date(cd.date);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cd);
      }
    }
    const allClassDays = unique;
    
    // Apply pagination
    const totalDays = allClassDays.length;
    const page = allClassDays.slice(args.offset, args.offset + args.limit);
    const classDayIds = page.map(cd => cd._id);
    
    // Get all students enrolled in this section
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
    
    const studentIds = enrollments.map(e => e.studentId);
    const enrollmentByStudent = new Map(enrollments.map(e => [e.studentId, e]));
    const students = await Promise.all(
      studentIds.map(id => ctx.db.get(id))
    );
    
    // Get attendance records for the paginated class days
    const attendanceRecords = classDayIds.length > 0 ? await ctx.db
      .query("attendanceRecords")
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect() : [];
    
    // Get manual status changes for the paginated class days
    const manualChanges = classDayIds.length > 0 ? await ctx.db
      .query("manualStatusChanges")
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect() : [];
    
    // Create lookup maps
    const attendanceMap = new Map();
    attendanceRecords.forEach(ar => {
      attendanceMap.set(`${ar.classDayId}-${ar.studentId}`, ar);
    });
    
    const manualChangeMap = new Map();
    manualChanges.forEach(mc => {
      manualChangeMap.set(`${mc.classDayId}-${mc.studentId}`, mc);
    });
    
    // Build student records
    const studentRecords = students.map(student => {
      if (!student) return null;
      
      const records = page.map(classDay => {
        const attendanceRecord = attendanceMap.get(`${classDay._id}-${student._id}`);
        const manualChange = manualChangeMap.get(`${classDay._id}-${student._id}`);
        
        const originalStatus = attendanceRecord?.status || "BLANK";
        const isManual = !!manualChange;
        let effectiveStatus = manualChange ? manualChange.status : originalStatus;

        // Fallback: mark BLANK as ABSENT after end-of-day if enrolled by that day
        if (!attendanceRecord && !manualChange) {
          const endOfDay = (classDay.date as number) + DAY_MS;
          const enroll = enrollmentByStudent.get(student._id);
          const wasEnrolledByDay = !!enroll && enroll.createdAt <= endOfDay && (!enroll.removedAt || enroll.removedAt > endOfDay);
          if (now >= endOfDay && wasEnrolledByDay) effectiveStatus = "ABSENT";
        }
        
        return {
          classDayId: classDay._id,
          studentId: student._id,
          status: effectiveStatus,
          isManual,
          originalStatus,
          manualChange: manualChange ? {
            status: manualChange.status,
            teacherName: "Instructor", // We'll need to join with teacher data
            createdAt: manualChange.createdAt,
          } : undefined,
        };
      });
      
      return {
        studentId: student._id,
        records,
      };
    }).filter(Boolean);
    
    return {
      students: students.filter(Boolean).map(s => ({
        id: s!._id,
        firstName: s!.firstName,
        lastName: s!.lastName,
        email: s!.email,
      })),
      days: page.map(cd => ({
        id: cd._id,
        // Keep ISO for client parsing, but duplicates are avoided by local-day key above
        date: new Date(cd.date).toISOString().split('T')[0],
        attendanceCode: cd.attendanceCode,
      })),
      records: studentRecords,
      totalDays,
      offset: args.offset,
      limit: args.limit,
    };
  },
});

export const getStudentHistory = query({
  args: {
    studentId: v.id("users"),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Only allow the student to access their own consolidated history
    // Teachers should use section-scoped history above
    const identity = await ctx.auth.getUserIdentity();
    const email = (identity?.email ?? identity?.tokenIdentifier ?? "").toString().trim().toLowerCase();
    if (!email) throw new Error("Unauthenticated");
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!currentUser || currentUser._id !== args.studentId) throw new Error("Forbidden");
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    // Get all sections the student is enrolled in
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    
    const sectionIds = enrollments.map(e => e.sectionId);
    const sections = await Promise.all(
      sectionIds.map(id => ctx.db.get(id))
    );
    
    // Get all class days across these sections
    const rawDays = sectionIds.length > 0 ? await ctx.db
      .query("classDays")
      .filter((q) => q.or(...sectionIds.map(id => q.eq(q.field("sectionId"), id))))
      .order("desc")
      .collect() : [];
    // Deduplicate by LOCAL calendar day across sections for the student's consolidated view
    // Prefer a classDay that has any attendance records for this student if multiple exist same-day
    const uniqueDays = (() => {
      const map = new Map<number, any>();
      for (const cd of rawDays) {
        const d = new Date(cd.date);
        d.setHours(0, 0, 0, 0);
        const key = d.getTime();
        const existing = map.get(key);
        if (!existing) {
          map.set(key, cd);
        } else {
          // Check if either has a record for this student and prefer that one
          // Note: queries below will fetch records for the selected page; this is a heuristic early choice
          // We can refine after fetching records page, but to keep pagination stable, choose deterministically
          // Prefer the one with earlier Convex creation time to maintain stable order
          if ((cd._creationTime || 0) < (existing._creationTime || 0)) map.set(key, cd);
        }
      }
      return Array.from(map.values());
    })();
    
    // Apply pagination
    const totalDays = uniqueDays.length;
    const page = uniqueDays.slice(args.offset, args.offset + args.limit);
    const classDayIds = page.map(cd => cd._id);
    
    // Get attendance records for this student
    const attendanceRecords = classDayIds.length > 0 ? await ctx.db
      .query("attendanceRecords")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect() : [];
    
    // Get manual status changes for this student
    const manualChanges = classDayIds.length > 0 ? await ctx.db
      .query("manualStatusChanges")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .filter((q) => q.or(...classDayIds.map(id => q.eq(q.field("classDayId"), id))))
      .collect() : [];
    
    // Create lookup maps
    const attendanceMap = new Map();
    attendanceRecords.forEach(ar => {
      attendanceMap.set(ar.classDayId, ar);
    });
    
    const manualChangeMap = new Map();
    manualChanges.forEach(mc => {
      manualChangeMap.set(mc.classDayId, mc);
    });
    
    // Build records by section
    // Track enrollment windows per section
    const enrollmentBySection = new Map(enrollments.map(e => [e.sectionId, e]));

    const records = sections.map(section => {
      if (!section) return null;
      
      const byDate: Record<string, any> = {};
      
      page.forEach(classDay => {
        if (classDay.sectionId !== section._id) return;
        
        const dateKey = new Date(classDay.date).toISOString().split('T')[0];
        const attendanceRecord = attendanceMap.get(classDay._id);
        const manualChange = manualChangeMap.get(classDay._id);
        
        const originalStatus = attendanceRecord?.status || "BLANK";
        const isManual = !!manualChange;
        let effectiveStatus = manualChange ? manualChange.status : originalStatus;
        if (!attendanceRecord && !manualChange) {
          const endOfDay = (classDay.date as number) + DAY_MS;
          const enroll = enrollmentBySection.get(section._id);
          const wasEnrolledByDay = !!enroll && enroll.createdAt <= endOfDay && (!enroll.removedAt || enroll.removedAt > endOfDay);
          if (now >= endOfDay && wasEnrolledByDay) effectiveStatus = "ABSENT";
        }
        
        byDate[dateKey] = {
          status: effectiveStatus,
          originalStatus,
          isManual,
          manualChange: manualChange ? {
            status: manualChange.status,
            teacherName: "Instructor", // We'll need to join with teacher data
            createdAt: manualChange.createdAt,
          } : null,
        };
      });
      
      return {
        sectionId: section._id,
        byDate,
      };
    }).filter(Boolean);
    
    return {
      sections: sections.filter(Boolean).map(s => ({
        id: s!._id,
        title: s!.title,
      })),
      days: page.map(cd => ({
        // Keep ISO YYYY-MM-DD for the UI keys; dedupe was done using local-day above
        date: new Date(cd.date).toISOString().split('T')[0],
      })),
      records,
      totalDays,
      offset: args.offset,
      limit: args.limit,
    };
  },
});
