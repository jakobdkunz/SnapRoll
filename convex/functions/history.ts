import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { requireTeacher, requireTeacherOwnsSection } from "./_auth";
import { getEasternDayBounds } from "./_tz";

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
    // Get all class days for this section, ordered by date asc
    const rawDays = await ctx.db
      .query("classDays")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .order("asc")
      .collect();

    // Deduplicate by Eastern Time calendar day to avoid duplicate columns
    // Align with how classDays.date is stored (start of day in ET)
    const unique: typeof rawDays = [];
    const seen = new Set<number>();
    for (const cd of rawDays) {
      const { startMs } = getEasternDayBounds(cd.date as number);
      const key = startMs;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cd);
      }
    }
    const allClassDays = unique;
    
    // Apply pagination (oldest first overall; offset points to oldest page)
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
    
    // Get attendance records for the paginated class days via indexed lookups
    const attendanceRecords = classDayIds.length > 0
      ? (await Promise.all(
          classDayIds.map((id) =>
            ctx.db
              .query("attendanceRecords")
              .withIndex("by_classDay", (q) => q.eq("classDayId", id))
              .collect()
          )
        )).flat()
      : [];
    
    // Get manual status changes for the paginated class days via indexed lookups
    const manualChanges = classDayIds.length > 0
      ? (await Promise.all(
          classDayIds.map((id) =>
            ctx.db
              .query("manualStatusChanges")
              .withIndex("by_classDay", (q) => q.eq("classDayId", id))
              .collect()
          )
        )).flat()
      : [];
    // Resolve instructor names for manual changes
    const teacherIds = Array.from(
      new Set(
        manualChanges
          .map((mc) => mc.teacherId as Id<'users'>)
          .filter((id): id is Id<'users'> => Boolean(id))
      )
    );
    const teacherDocs = await Promise.all(teacherIds.map((id) => ctx.db.get(id)));
    const teacherNameById = new Map<Id<'users'>, string>(
      teacherDocs
        .filter((t): t is Doc<'users'> => Boolean(t))
        .map((t) => [t._id as Id<'users'>, `${t.firstName} ${t.lastName}`])
    );
    
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
        // Treat manual changes with BLANK as no-op (legacy rows shouldn't block fallback)
        const hasManual = !!manualChange && manualChange.status !== "BLANK";
        let effectiveStatus = hasManual ? manualChange!.status : originalStatus;

        // Fallback: after end-of-day, if no effective manual override and record is missing/BLANK:
        // - If enrolled by that day: ABSENT
        // - If not enrolled by that day: NOT_JOINED (aka Not Enrolled)
        if (!hasManual && (!attendanceRecord || attendanceRecord.status === "BLANK")) {
          const { nextStartMs } = getEasternDayBounds(classDay.date as number);
          const endOfDay = nextStartMs;
          const enroll = enrollmentByStudent.get(student._id);
          const wasEnrolledByDay = !!enroll && enroll.createdAt <= endOfDay && (!enroll.removedAt || enroll.removedAt > endOfDay);
          if (now >= endOfDay) {
            effectiveStatus = wasEnrolledByDay ? "ABSENT" : "NOT_JOINED";
          }
        }
        
        return {
          classDayId: classDay._id,
          studentId: student._id,
          status: effectiveStatus,
          isManual: hasManual,
          originalStatus,
          manualChange: hasManual ? {
            status: manualChange!.status,
            teacherName: teacherNameById.get(manualChange!.teacherId) || "Instructor",
            createdAt: manualChange!.createdAt,
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
        // Keep ISO string of ET date (YYYY-MM-DD)
        date: new Date(getEasternDayBounds(cd.date as number).startMs).toISOString().split('T')[0],
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
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!currentUser || currentUser._id !== args.studentId) throw new Error("Forbidden");
    const now = Date.now();
    // Get all sections the student is enrolled in
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();

    const sectionIds = enrollments.map((e) => e.sectionId);
    const sections = await Promise.all(sectionIds.map((id) => ctx.db.get(id)));

    // Get all class days across these sections
    const rawDays = sectionIds.length > 0
      ? await ctx.db
          .query("classDays")
          .filter((q) => q.or(...sectionIds.map((id) => q.eq(q.field("sectionId"), id))))
          .order("desc")
          .collect()
      : [];

    // Build mapping from local-day key -> per-section classDay
    const dateKeyToSectionDay = new Map<number, Map<Id<'sections'>, Doc<'classDays'>>>();
    for (const cd of rawDays) {
      const { startMs } = getEasternDayBounds(cd.date as number);
      const key = startMs;
      let map = dateKeyToSectionDay.get(key);
      if (!map) {
        map = new Map();
        dateKeyToSectionDay.set(key, map);
      }
      if (!map.has(cd.sectionId as Id<'sections'>)) {
        map.set(cd.sectionId as Id<'sections'>, cd as Doc<'classDays'>);
      }
    }

    // Unique date keys, newest first
    const allDateKeys = Array.from(dateKeyToSectionDay.keys()).sort((a, b) => b - a);

    // Apply pagination on date keys
    const totalDays = allDateKeys.length;
    const pageDateKeys = allDateKeys.slice(args.offset, args.offset + args.limit);

    // Collect classDayIds for selected page (across sections) to fetch records/overrides for this student
    const pageClassDayIds: Id<'classDays'>[] = [] as unknown as Id<'classDays'>[];
    for (const key of pageDateKeys) {
      const sectionMap = dateKeyToSectionDay.get(key)!;
      for (const [, cd] of sectionMap) pageClassDayIds.push(cd._id as Id<'classDays'>);
    }

    // Get attendance records for this student on the selected class days
    const attendanceRecords = pageClassDayIds.length > 0
      ? await ctx.db
          .query("attendanceRecords")
          .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
          .filter((q) => q.or(...pageClassDayIds.map((id) => q.eq(q.field("classDayId"), id))))
          .collect()
      : [];

    // Get manual status changes for this student on the selected class days
    const manualChanges = pageClassDayIds.length > 0
      ? await ctx.db
          .query("manualStatusChanges")
          .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
          .filter((q) => q.or(...pageClassDayIds.map((id) => q.eq(q.field("classDayId"), id))))
          .collect()
      : [];

    // Resolve instructor names for manual changes
    const teacherIds = Array.from(new Set(manualChanges.map((mc) => mc.teacherId as Id<'users'>)));
    const teacherDocs = await Promise.all(teacherIds.map((id) => ctx.db.get(id)));
    const teacherNameById = new Map<Id<'users'>, string>(
      teacherDocs
        .filter((t): t is Doc<'users'> => Boolean(t))
        .map((t) => [t._id as Id<'users'>, `${t.firstName} ${t.lastName}`])
    );

    // Create lookup maps keyed by classDayId
    const attendanceByClassDay = new Map<Id<'classDays'>, Doc<'attendanceRecords'>>();
    for (const ar of attendanceRecords) attendanceByClassDay.set(ar.classDayId as Id<'classDays'>, ar as Doc<'attendanceRecords'>);

    const manualByClassDay = new Map<Id<'classDays'>, Doc<'manualStatusChanges'>>();
    for (const mc of manualChanges) manualByClassDay.set(mc.classDayId as Id<'classDays'>, mc as Doc<'manualStatusChanges'>);

    // Track enrollment windows per section
    const enrollmentBySection = new Map(enrollments.map((e) => [e.sectionId, e]));

    // Build records by section for the paginated dates
    const records = sections
      .map((section) => {
        if (!section) return null;

        const byDate: Record<string, {
          status: string;
          originalStatus: string;
          isManual: boolean;
          manualChange: { status: string; teacherName: string; createdAt: number } | null;
        }> = {};

        for (const key of pageDateKeys) {
          const isoDate = new Date(key).toISOString().split('T')[0];
          const sectionMap = dateKeyToSectionDay.get(key)!;
          const classDay = sectionMap.get(section._id as Id<'sections'>);
          if (!classDay) continue; // no class for this section on that date → leave as BLANK by omission

          const attendanceRecord = attendanceByClassDay.get(classDay._id as Id<'classDays'>);
          const manualChange = manualByClassDay.get(classDay._id as Id<'classDays'>);

          const originalStatus = attendanceRecord?.status || "BLANK";
          // Treat manual BLANK as no-op so fallback can apply
          const hasManual = !!manualChange && manualChange.status !== "BLANK";
          let effectiveStatus = hasManual ? manualChange!.status : originalStatus;
          if (!hasManual && (!attendanceRecord || attendanceRecord.status === "BLANK")) {
            const { nextStartMs } = getEasternDayBounds(classDay.date as number);
            const endOfDay = nextStartMs;
            const enroll = enrollmentBySection.get(section._id);
            const wasEnrolledByDay = !!enroll && enroll.createdAt <= endOfDay && (!enroll.removedAt || enroll.removedAt > endOfDay);
            if (now >= endOfDay) {
              effectiveStatus = wasEnrolledByDay ? "ABSENT" : "NOT_JOINED";
            }
          }

          byDate[isoDate] = {
            status: effectiveStatus,
            originalStatus,
            isManual: hasManual,
            manualChange: hasManual
              ? {
                  status: manualChange!.status,
                  teacherName: teacherNameById.get(manualChange!.teacherId) || "Instructor",
                  createdAt: manualChange!.createdAt,
                }
              : null,
          };
        }

        return { sectionId: section._id, byDate };
      })
      .filter(Boolean);

    return {
      sections: sections.filter(Boolean).map((s) => ({ id: s!._id, title: s!.title })),
      days: pageDateKeys.map((key) => ({ date: new Date(key).toISOString().split('T')[0] })),
      records,
      totalDays,
      offset: args.offset,
      limit: args.limit,
    };
  },
});

// Export all days and student statuses for a section as a flat matrix
export const exportSectionHistory = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<'sections'>, teacher._id);
    const now = Date.now();

    // Get all class days for this section, ordered by date asc
    const rawDays = await ctx.db
      .query("classDays")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .order("asc")
      .collect();

    // Deduplicate by ET calendar day
    const unique: typeof rawDays = [];
    const seen = new Set<number>();
    for (const cd of rawDays) {
      const { startMs } = getEasternDayBounds(cd.date as number);
      if (!seen.has(startMs)) {
        seen.add(startMs);
        unique.push(cd);
      }
    }
    const classDays = unique;
    const classDayIds = classDays.map(cd => cd._id as Id<'classDays'>);

    // Get enrollments and students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
    const studentIds = enrollments.map(e => e.studentId as Id<'users'>);
    const enrollmentByStudent = new Map(enrollments.map(e => [e.studentId as Id<'users'>, e]));
    const studentDocs = await Promise.all(studentIds.map(id => ctx.db.get(id)));
    const students = studentDocs
      .filter((s): s is Doc<'users'> => Boolean(s))
      .map(s => ({ id: s._id as Id<'users'>, firstName: s.firstName, lastName: s.lastName, email: s.email }));

    // Attendance and manual changes
    const attendanceRecords = classDayIds.length > 0
      ? (await Promise.all(
          classDayIds.map((id) =>
            ctx.db
              .query("attendanceRecords")
              .withIndex("by_classDay", (q) => q.eq("classDayId", id))
              .collect()
          )
        )).flat()
      : [];
    const manualChanges = classDayIds.length > 0
      ? (await Promise.all(
          classDayIds.map((id) =>
            ctx.db
              .query("manualStatusChanges")
              .withIndex("by_classDay", (q) => q.eq("classDayId", id))
              .collect()
          )
        )).flat()
      : [];

    const attendanceMap = new Map<string, Doc<'attendanceRecords'>>();
    for (const ar of attendanceRecords) attendanceMap.set(`${ar.classDayId}-${ar.studentId}`, ar as Doc<'attendanceRecords'>);
    const manualMap = new Map<string, Doc<'manualStatusChanges'>>();
    for (const mc of manualChanges) manualMap.set(`${mc.classDayId}-${mc.studentId}`, mc as Doc<'manualStatusChanges'>);

    // Build day headers (ISO YYYY-MM-DD in ET)
    const days = classDays.map(cd => new Date(getEasternDayBounds(cd.date as number).startMs).toISOString().split('T')[0]);

    // Build rows per student with final status per day
    const rows = students.map((s) => {
      const statuses = classDays.map((classDay): "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_JOINED" | "BLANK" => {
        const k = `${classDay._id}-${s.id}`;
        const ar = attendanceMap.get(k);
        const mc = manualMap.get(k);
        const original = ar?.status || "BLANK";
        const hasManual = !!mc && mc.status !== "BLANK";
        let effective: "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_JOINED" | "BLANK" = hasManual ? (mc!.status as "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_JOINED" | "BLANK") : (original as "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_JOINED" | "BLANK");
        if (!hasManual && (!ar || ar.status === "BLANK")) {
          const { nextStartMs } = getEasternDayBounds(classDay.date as number);
          const endOfDay = nextStartMs;
          const enroll = enrollmentByStudent.get(s.id as Id<'users'>);
          const wasEnrolledByDay = !!enroll && enroll.createdAt <= endOfDay && (!enroll.removedAt || enroll.removedAt > endOfDay);
          if (now >= endOfDay) {
            effective = wasEnrolledByDay ? "ABSENT" : "NOT_JOINED";
          }
        }
        return effective;
      });
      return { firstName: s.firstName, lastName: s.lastName, email: s.email, statuses };
    });

    return { days, rows };
  },
});
