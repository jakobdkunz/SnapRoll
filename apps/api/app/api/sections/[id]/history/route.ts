import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  const url = new URL(request.url);
  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  const offset = Math.max(0, Number.isFinite(Number(offsetParam)) ? Number(offsetParam) : 0);
  const rawLimit = Math.max(1, Number.isFinite(Number(limitParam)) ? Number(limitParam) : 30);
  const limit = Math.min(rawLimit, 60);

  // Respect client timezone for day uniqueness (avoid duplicate local days)
  const tzHeader = request.headers.get('x-tz-offset');
  const tzMinutes = tzHeader ? parseInt(tzHeader, 10) : new Date().getTimezoneOffset();
  const toLocalYmd = (d: Date) => {
    const localMs = d.getTime() - tzMinutes * 60 * 1000;
    const local = new Date(localMs);
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Get all class days and group by local day, keeping the latest entry per local day
  const allClassDays = await prisma.classDay.findMany({
    where: { sectionId: id },
    orderBy: { date: 'desc' },
  });
  const seen = new Set<string>();
  const uniqueDays: { ymd: string; cd: typeof allClassDays[number] }[] = [];
  for (const cd of allClassDays) {
    const ymd = toLocalYmd(cd.date);
    if (seen.has(ymd)) continue;
    seen.add(ymd);
    uniqueDays.push({ ymd, cd });
  }
  const totalDays = uniqueDays.length;
  const page = uniqueDays.slice(offset, offset + limit);
  const classDays = page.map(p => p.cd);

  // Get all students enrolled in this section with enrollment timestamps
  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId: id },
    include: { student: true },
    orderBy: [
      { student: { lastName: 'asc' } },
      { student: { firstName: 'asc' } }
    ]
  });

  // Get attendance records only for returned class days
  const classDayIds = classDays.map((cd) => cd.id);
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { classDayId: { in: classDayIds } },
  });

  // Get all manual status changes for this section
  const manualChanges = await prisma.manualStatusChange.findMany({
    where: { classDayId: { in: classDayIds } },
    include: { 
      classDay: true,
      teacher: true
    }
  });

  // Create a map for quick lookup of manual changes
  const manualChangeMap = new Map<string, typeof manualChanges[number]>();
  for (const change of manualChanges) {
    manualChangeMap.set(`${change.classDayId}-${change.studentId}`, change);
  }
  const attendanceMap = new Map<string, typeof attendanceRecords[number]>();
  for (const ar of attendanceRecords) {
    attendanceMap.set(`${ar.classDayId}-${ar.studentId}`, ar);
  }

  const now = new Date();

  // Create the history data structure
  const history = {
    students: enrollments.map(e => ({
      id: e.student.id,
      email: e.student.email,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
    })),
    days: classDays.map(cd => ({
      id: cd.id,
      date: cd.date,
      attendanceCode: cd.attendanceCode,
    })),
    records: enrollments.map(enrollment => {
      const studentRecords = classDays.map(classDay => {
        const attendanceRecord = attendanceMap.get(`${classDay.id}-${enrollment.studentId}`);
        const manualChange = manualChangeMap.get(`${classDay.id}-${enrollment.studentId}`);
        
        // Application-level logic for determining effective status
        const effectiveStatus = (() => {
          if (manualChange) return manualChange.status; // Manual changes take precedence
          
          if (attendanceRecord?.status) return attendanceRecord.status; // Has attendance record
          
          // No attendance record - determine if this should be ABSENT
          const classDayDate = classDay.date;
          const enrollmentDate = enrollment.createdAt;
          const isPastDate = classDayDate < now;
          const wasEnrolled = classDayDate >= enrollmentDate;
          
          if (isPastDate && wasEnrolled) {
            return 'ABSENT'; // Past date, was enrolled, no record = ABSENT
          }
          
          return 'BLANK'; // Not enrolled yet or future date
        })();
        
        const originalStatus = attendanceRecord?.status || 'BLANK';
        const isManual = !!manualChange;
        
        return {
          classDayId: classDay.id,
          studentId: enrollment.studentId,
          status: effectiveStatus,
          originalStatus: originalStatus,
          isManual,
          manualChange: manualChange ? {
            status: manualChange.status,
            teacherName: `${manualChange.teacher.firstName} ${manualChange.teacher.lastName}`,
            createdAt: manualChange.createdAt,
          } : null,
        };
      });
      
      return {
        studentId: enrollment.studentId,
        records: studentRecords,
      };
    }),
    totalDays,
    offset,
    limit,
  };

  return NextResponse.json(history);
}
