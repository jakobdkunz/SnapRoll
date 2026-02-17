import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isDemoMode, requireStudent, requireTeacher, requireTeacherOwnsSection } from "./_auth";
import { getEasternDayBounds } from "./_tz";

async function getActiveClassDaysForSection(
  ctx: QueryCtx,
  sectionId: Id<"sections">
): Promise<Doc<"classDays">[]> {
  const classDays = await ctx.db
    .query("classDays")
    .withIndex("by_section", (q) => q.eq("sectionId", sectionId))
    .collect();

  const active = await Promise.all(
    classDays.map(async (classDay) => {
      if (classDay.hasActivity === true) return classDay as Doc<"classDays">;
      const [attendance, manual] = await Promise.all([
        ctx.db
          .query("attendanceRecords")
          .withIndex("by_classDay", (q) => q.eq("classDayId", classDay._id))
          .first(),
        ctx.db
          .query("manualStatusChanges")
          .withIndex("by_classDay", (q) => q.eq("classDayId", classDay._id))
          .first(),
      ]);
      return attendance || manual ? (classDay as Doc<"classDays">) : null;
    })
  );

  return active.filter((d): d is Doc<"classDays"> => Boolean(d));
}

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
    // Include explicit active days and legacy days with recorded attendance/manual changes.
    const rawDays = await getActiveClassDaysForSection(ctx, args.sectionId as Id<"sections">);
    // Ensure ascending order by date for display
    const allClassDays = rawDays.sort((a, b) => (a.date as number) - (b.date as number));

    // Apply pagination against active class days
    const totalDays = allClassDays.length;
    const pageForDisplay = allClassDays.slice(args.offset, args.offset + args.limit);
    const classDayIds = pageForDisplay.map(cd => cd._id);
    
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
    
    // Build student records and track absence totals per student
    const studentRecords = students.map(student => {
      if (!student) return null;
      
      const records = pageForDisplay.map(classDay => {
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
    // Compute total ABSENT counts per student across ALL active days in section
    const allClassDayIds = allClassDays.map(cd => cd._id as Id<'classDays'>);
    const allAttendance = allClassDayIds.length > 0
      ? (await Promise.all(
          allClassDayIds.map((id) =>
            ctx.db
              .query("attendanceRecords")
              .withIndex("by_classDay", (q) => q.eq("classDayId", id))
              .collect()
          )
        )).flat()
      : [];
    const allManual = allClassDayIds.length > 0
      ? (await Promise.all(
          allClassDayIds.map((id) =>
            ctx.db
              .query("manualStatusChanges")
              .withIndex("by_classDay", (q) => q.eq("classDayId", id))
              .collect()
          )
        )).flat()
      : [];
    const arByDayStudent = new Map<string, Doc<'attendanceRecords'>>();
    for (const ar of allAttendance) arByDayStudent.set(`${ar.classDayId}-${ar.studentId}`, ar as Doc<'attendanceRecords'>);
    const mcByDayStudent = new Map<string, Doc<'manualStatusChanges'>>();
    for (const mc of allManual) mcByDayStudent.set(`${mc.classDayId}-${mc.studentId}`, mc as Doc<'manualStatusChanges'>);
    const absencesByStudentId = new Map<string, number>();
    for (const s of students) {
      if (!s) continue;
      let count = 0;
      for (const classDay of allClassDays) {
        const k = `${classDay._id}-${s._id}`;
        const ar = arByDayStudent.get(k);
        const mc = mcByDayStudent.get(k);
        const original = ar?.status || "BLANK";
        const hasManual = !!mc && mc.status !== "BLANK";
        let effective: "PRESENT" | "ABSENT" | "EXCUSED" | "NOT_JOINED" | "BLANK" = hasManual ? (mc!.status as any) : (original as any);
        if (!hasManual && (!ar || ar.status === "BLANK")) {
          const { nextStartMs } = getEasternDayBounds(classDay.date as number);
          const endOfDay = nextStartMs;
          const enroll = enrollmentByStudent.get(s._id as Id<'users'>);
          const wasEnrolledByDay = !!enroll && enroll.createdAt <= endOfDay && (!enroll.removedAt || enroll.removedAt > endOfDay);
          if (now >= endOfDay) effective = wasEnrolledByDay ? "ABSENT" : "NOT_JOINED";
        }
        if (effective === "ABSENT") count++;
      }
      absencesByStudentId.set(s._id as string, count);
    }

    return {
      students: students.filter(Boolean).map(s => ({
        id: s!._id,
        firstName: s!.firstName,
        lastName: s!.lastName,
        email: s!.email,
        totalAbsences: absencesByStudentId.get(s!._id as string) || 0,
      })),
      days: pageForDisplay.map(cd => ({
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

// Participation grid and totals calculation
export const getParticipationBySection = query({
  args: {
    sectionId: v.id("sections"),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<'sections'>, teacher._id);

    const section = await ctx.db.get(args.sectionId);
    const totalPoints = Number((section as any)?.participationCreditPointsPossible || 0);

    // Active class days (hasActivity true) in ascending order
    const allDays = (await getActiveClassDaysForSection(ctx, args.sectionId as Id<"sections">))
      .sort((a, b) => (a.date as number) - (b.date as number));

    const totalDays = allDays.length;
    const page = allDays.slice(args.offset, args.offset + args.limit);
    const pageIds = page.map(d => d._id as Id<'classDays'>);

    // Enrollments/students
    const enrollments = await ctx.db.query('enrollments').withIndex('by_section', (q) => q.eq('sectionId', args.sectionId)).collect();
    const studentIds = enrollments.map(e => e.studentId as Id<'users'>);
    const studentDocs = await Promise.all(studentIds.map(id => ctx.db.get(id)));
    const students = studentDocs.filter(Boolean) as Doc<'users'>[];

    // Attendance per page day
    const attendanceByDayStudent = new Map<string, Doc<'attendanceRecords'>>();
    const manualByDayStudent = new Map<string, Doc<'manualStatusChanges'>>();
    const manualLists = await Promise.all(pageIds.map(id => ctx.db.query('manualStatusChanges').withIndex('by_classDay', (q)=> q.eq('classDayId', id)).collect()));
    for (const ml of manualLists) for (const mc of ml) manualByDayStudent.set(`${mc.classDayId}-${mc.studentId}`, mc as Doc<'manualStatusChanges'>);
    const attendanceLists = await Promise.all(pageIds.map(id => ctx.db.query('attendanceRecords').withIndex('by_classDay', (q)=> q.eq('classDayId', id)).collect()));
    for (const al of attendanceLists) for (const ar of al) attendanceByDayStudent.set(`${ar.classDayId}-${ar.studentId}`, ar as Doc<'attendanceRecords'>);

    // Sessions per page day
    const sessionsByDay = new Map<Id<'classDays'>, { pollIds: Id<'pollSessions'>[]; wcIds: Id<'wordCloudSessions'>[] }>();
    for (const day of page) {
      const { startMs, nextStartMs } = getEasternDayBounds(day.date as number);
      const pollSessions = await ctx.db
        .query('pollSessions')
        .withIndex('by_section', (q)=> q.eq('sectionId', args.sectionId))
        .filter((q)=> q.and(q.gte(q.field('createdAt'), startMs), q.lt(q.field('createdAt'), nextStartMs)))
        .collect();
      const wcSessions = await ctx.db
        .query('wordCloudSessions')
        .withIndex('by_section', (q)=> q.eq('sectionId', args.sectionId))
        .filter((q)=> q.and(q.gte(q.field('createdAt'), startMs), q.lt(q.field('createdAt'), nextStartMs)))
        .collect();
      const filteredPollIds = pollSessions.filter(s => (s as any)?.countsForParticipation === true).map(s=> s._id as Id<'pollSessions'>);
      const filteredWcIds = wcSessions.filter(s => (s as any)?.countsForParticipation === true).map(s=> s._id as Id<'wordCloudSessions'>);
      sessionsByDay.set(day._id as Id<'classDays'>, { pollIds: filteredPollIds, wcIds: filteredWcIds });
    }

    // Answers lookups
    const pollAnswerBySessionStudent = new Set<string>();
    const wcAnswerBySessionStudent = new Set<string>();
    for (const day of page) {
      const sess = sessionsByDay.get(day._id as Id<'classDays'>)!;
      for (const pid of sess.pollIds) {
        const answers = await ctx.db.query('pollAnswers').withIndex('by_session', (q)=> q.eq('sessionId', pid)).collect();
        for (const a of answers) pollAnswerBySessionStudent.add(`${pid}-${a.studentId}`);
      }
      for (const wid of sess.wcIds) {
        const answers = await ctx.db.query('wordCloudAnswers').withIndex('by_session', (q)=> q.eq('sessionId', wid)).collect();
        for (const a of answers) wcAnswerBySessionStudent.add(`${wid}-${a.studentId}`);
      }
    }

    // Precompute course-level denominators
    let totalCourseShares = 0;
    // Sum of all activities across all active days
    for (const day of allDays) {
      const { startMs, nextStartMs } = getEasternDayBounds(day.date as number);
      const pollSessions = await ctx.db
        .query('pollSessions')
        .withIndex('by_section', (q)=> q.eq('sectionId', args.sectionId))
        .filter((q)=> q.and(q.gte(q.field('createdAt'), startMs), q.lt(q.field('createdAt'), nextStartMs)))
        .collect();
      const wcSessions = await ctx.db
        .query('wordCloudSessions')
        .withIndex('by_section', (q)=> q.eq('sectionId', args.sectionId))
        .filter((q)=> q.and(q.gte(q.field('createdAt'), startMs), q.lt(q.field('createdAt'), nextStartMs)))
        .collect();
      totalCourseShares += pollSessions.filter(s => (s as any)?.countsForParticipation === true).length +
        wcSessions.filter(s => (s as any)?.countsForParticipation === true).length;
    }
    if (totalCourseShares <= 0) totalCourseShares = 1;

    // Build per-student records
    const records = students.map((s) => {
      const rows = page.map((day) => {
        const k = `${day._id}-${s._id}`;
        const ar = attendanceByDayStudent.get(k);
        const mc = manualByDayStudent.get(k);
        const original = ar?.status || 'BLANK';
        const hasManual = !!mc && mc.status !== 'BLANK';
        let effective = hasManual ? (mc!.status as any) : (original as any);
        const wasPresent = effective === 'PRESENT';
        const sess = sessionsByDay.get(day._id as Id<'classDays'>)!;
        const activityShares = sess.pollIds.reduce((acc, id)=> acc + (pollAnswerBySessionStudent.has(`${id}-${s._id}`) ? 1 : 0), 0) +
          sess.wcIds.reduce((acc, id)=> acc + (wcAnswerBySessionStudent.has(`${id}-${s._id}`) ? 1 : 0), 0);
        const daySharesTotal = sess.pollIds.length + sess.wcIds.length;
        const daySharesEarned = wasPresent ? activityShares : 0;
        return { classDayId: day._id as Id<'classDays'>, sharesEarned: daySharesEarned, sharesTotal: daySharesTotal, absent: !wasPresent };
      });
      return { studentId: s._id as Id<'users'>, rows };
    });

    // Totals per student
    const totals = records.map((r) => {
      if (totalCourseShares <= 0) return { studentId: r.studentId, points: 0 };
      let earned = 0;
      for (const row of r.rows) {
        if (row.absent) continue;
        earned += Math.max(0, row.sharesEarned);
      }
      const pts = (earned / totalCourseShares) * totalPoints;
      return { studentId: r.studentId, points: Math.round(pts) };
    });

    return {
      days: page.map((d) => ({ id: d._id as Id<'classDays'>, date: new Date(getEasternDayBounds(d.date as number).startMs).toISOString().split('T')[0] })),
      records,
      totals,
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
    // Only allow the student to access their own consolidated history.
    // Teachers should use section-scoped history above.
    if (isDemoMode()) {
      const targetStudent = await ctx.db.get(args.studentId);
      if (!targetStudent || targetStudent.role !== "STUDENT") throw new Error("Forbidden");
    } else {
      const currentStudent = await requireStudent(ctx);
      if (currentStudent._id !== args.studentId) throw new Error("Forbidden");
    }
    const now = Date.now();
    // Get all sections the student is enrolled in
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    const activeEnrollments = enrollments.filter((e) => e.removedAt === undefined);

    const sectionIds = activeEnrollments.map((e) => e.sectionId);
    const sections = await Promise.all(sectionIds.map((id) => ctx.db.get(id)));

    // Get all class days across these sections
    const rawDays = sectionIds.length > 0
      ? (await Promise.all(
          sectionIds.map((id) => getActiveClassDaysForSection(ctx, id as Id<"sections">))
        )).flat()
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

    // Unique date keys, newest first, using only active days
    const allDateKeys = Array.from(dateKeyToSectionDay.keys()).sort((a, b) => b - a);

    // Apply pagination on active date keys
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
    const enrollmentBySection = new Map(activeEnrollments.map((e) => [e.sectionId, e]));

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

    // Compute total absences per section across ALL active days (not just paged window)
    const allRawDaysBySection = new Map<Id<'sections'>, Doc<'classDays'>[]>();
    for (const id of sectionIds) {
      const days = await getActiveClassDaysForSection(ctx, id as Id<"sections">);
      allRawDaysBySection.set(id, days);
    }
    let totalAbsencesBySection = new Map<Id<'sections'>, number>();
    for (const section of sections) {
      if (!section) continue;
      const allDays = allRawDaysBySection.get(section._id as Id<'sections'>) || [];
      let count = 0;
      for (const cd of allDays) {
        const ar = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_classDay_student", (q) => q.eq("classDayId", cd._id).eq("studentId", args.studentId))
          .first();
        const mc = await ctx.db
          .query("manualStatusChanges")
          .withIndex("by_classDay_student", (q) => q.eq("classDayId", cd._id).eq("studentId", args.studentId))
          .first();
        const original = ar?.status || "BLANK";
        const hasManual = !!mc && mc.status !== "BLANK";
        let effective = hasManual ? mc!.status : original;
        if (!hasManual && (!ar || ar.status === "BLANK")) {
          const { nextStartMs } = getEasternDayBounds(cd.date as number);
          const endOfDay = nextStartMs;
          const enroll = activeEnrollments.find(e => e.sectionId === section._id);
          const wasEnrolledByDay = !!enroll && enroll.createdAt <= endOfDay && (!enroll.removedAt || enroll.removedAt > endOfDay);
          if (now >= endOfDay) effective = wasEnrolledByDay ? "ABSENT" : "NOT_JOINED";
        }
        if (effective === "ABSENT") count++;
      }
      totalAbsencesBySection.set(section._id as Id<'sections'>, count);
    }

    return {
      sections: sections.filter(Boolean).map((s) => ({ id: s!._id, title: s!.title })),
      days: pageDateKeys.map((key) => ({ date: new Date(key).toISOString().split('T')[0] })),
      records,
      totals: Array.from(totalAbsencesBySection.entries()).map(([sectionId, total]) => ({ sectionId, total })),
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

    // Get all active class days for this section, ordered by date asc
    const classDays = (await getActiveClassDaysForSection(ctx, args.sectionId as Id<"sections">))
      .sort((a, b) => (a.date as number) - (b.date as number));
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

// Gamification: list points opportunities for instructor management (with assignment counts)
export const getPointsOpportunities = query({
  args: { sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, args.sectionId as Id<'sections'>, teacher._id);
    const opps = await ctx.db
      .query("pointsOpportunities")
      .withIndex("by_section", (q) => q.eq("sectionId", args.sectionId))
      .collect();
    const results = await Promise.all(opps.map(async (o) => {
      const assigns = await ctx.db.query("pointsAssignments").withIndex("by_opportunity", (q) => q.eq("opportunityId", o._id as Id<'pointsOpportunities'>)).collect();
      return { ...o, assignmentCount: assigns.length };
    }));
    return results.sort((a, b) => (a.createdAt as number) - (b.createdAt as number));
  }
});

// Gamification: toggle undo/redo for opportunity
export const toggleOpportunityUndone = mutation({
  args: { opportunityId: v.id("pointsOpportunities"), undone: v.boolean() },
  handler: async (ctx, args) => {
    const opp = await ctx.db.get(args.opportunityId);
    if (!opp) throw new Error("Not found");
    const teacher = await requireTeacher(ctx);
    await requireTeacherOwnsSection(ctx, opp.sectionId as Id<'sections'>, teacher._id);
    await ctx.db.patch(args.opportunityId, { undone: args.undone });
  }
});

// Gamification: get student points in section (earned vs possible)
export const getStudentPointsBySection = query({
  args: { studentId: v.id("users"), sectionId: v.id("sections") },
  handler: async (ctx, args) => {
    // allow teacher-owner; else student self only
    try {
      const t = await requireTeacher(ctx);
      await requireTeacherOwnsSection(ctx, args.sectionId as Id<'sections'>, t._id);
    } catch {
      if (isDemoMode()) {
        const targetStudent = await ctx.db.get(args.studentId);
        if (!targetStudent || targetStudent.role !== "STUDENT") throw new Error("Forbidden");
      } else {
        const currentStudent = await requireStudent(ctx);
        if (currentStudent._id !== args.studentId) throw new Error("Forbidden");
      }
    }
    const assignments = await ctx.db
      .query('pointsAssignments')
      .withIndex('by_section_student', (q) => q.eq('sectionId', args.sectionId).eq('studentId', args.studentId))
      .collect();
    const oppIds = assignments.map(a => a.opportunityId as Id<'pointsOpportunities'>);
    const opps = await Promise.all(oppIds.map((id) => ctx.db.get(id)));
    let earned = 0;
    for (const o of opps) { if (o && !o.undone) earned += Number(o.points || 0); }
    const allOpps = await ctx.db.query('pointsOpportunities').withIndex('by_section', (q) => q.eq('sectionId', args.sectionId)).collect();
    const possible = allOpps.filter(o => !o.undone).reduce((acc, o) => acc + Number(o.points || 0), 0);
    return { pointsEarned: earned, pointsPossible: possible };
  }
});

// Gamification: student summary across enrolled sections
export const getStudentPointsSummary = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    // Only allow the student to access their own summary (or a teacher viewing their student is not supported here)
    if (isDemoMode()) {
      const targetStudent = await ctx.db.get(args.studentId);
      if (!targetStudent || targetStudent.role !== "STUDENT") throw new Error("Forbidden");
    } else {
      const currentStudent = await requireStudent(ctx);
      if (currentStudent._id !== args.studentId) throw new Error("Forbidden");
    }

    // Enrollments
    const enrollments = await ctx.db.query('enrollments').withIndex('by_student', (q) => q.eq('studentId', args.studentId)).collect();
    const sectionIds = enrollments.map(e => e.sectionId as Id<'sections'>);
    const sections = await Promise.all(sectionIds.map((id) => ctx.db.get(id)));

    // Assignments for this student by section
    const assignments = await ctx.db
      .query('pointsAssignments')
      .withIndex('by_student', (q) => q.eq('studentId', args.studentId))
      .collect();
    const oppIds = assignments.map(a => a.opportunityId as Id<'pointsOpportunities'>);
    const opps = await Promise.all(oppIds.map((id) => ctx.db.get(id)));
    const earnedBySection = new Map<string, number>();
    for (let i = 0; i < assignments.length; i++) {
      const assign = assignments[i];
      const opp = opps[i];
      if (!opp || opp.undone) continue;
      const key = String(assign.sectionId);
      earnedBySection.set(key, (earnedBySection.get(key) || 0) + Number(opp.points || 0));
    }

    // Possible per section: sum of not-undone opportunities points in that section
    const possibleBySection = new Map<string, number>();
    for (const sid of sectionIds) {
      const allOpps = await ctx.db.query('pointsOpportunities').withIndex('by_section', (q) => q.eq('sectionId', sid)).collect();
      const possible = allOpps.filter(o => !o.undone).reduce((acc, o) => acc + Number(o.points || 0), 0);
      possibleBySection.set(String(sid), possible);
    }

    return sections.filter(Boolean).map((s) => ({
      sectionId: s!._id as Id<'sections'>,
      sectionTitle: s!.title as string,
      pointsEarned: earnedBySection.get(String(s!._id)) || 0,
      pointsPossible: possibleBySection.get(String(s!._id)) || 0,
      participationCreditPointsPossible: Number((s as any)?.participationCreditPointsPossible || 0),
    }));
  }
});
