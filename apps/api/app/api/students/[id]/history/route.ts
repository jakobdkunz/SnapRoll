import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Returns a cross-section attendance grid for a single student.
// Response shape:
// {
//   sections: { id, title }[]
//   days: { date: string }[] // ISO date (YYYY-MM-DD) unique across sections, sorted desc
//   records: Array<{ sectionId: string; byDate: Record<string, { status: string; originalStatus: string; isManual: boolean; manualChange: { status: string; teacherName: string; createdAt: string } | null }> }>
//   totalDays: number
//   offset: number
//   limit: number
// }
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;

  const url = new URL(request.url);
  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  const offset = Math.max(0, Number.isFinite(Number(offsetParam)) ? Number(offsetParam) : 0);
  const rawLimit = Math.max(1, Number.isFinite(Number(limitParam)) ? Number(limitParam) : 20);
  const limit = Math.min(rawLimit, 60);

  // Sections for this student with enrollment timestamps
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { section: true },
    orderBy: { section: { title: 'asc' } },
  });
  const sections = enrollments.map((e) => ({ 
    id: e.section.id, 
    title: e.section.title,
    enrolledAt: e.createdAt 
  }));
  const sectionIds = sections.map((s) => s.id);

  if (sectionIds.length === 0) {
    return NextResponse.json({ 
      sections: [], 
      days: [], 
      records: [], 
      totalDays: 0, 
      offset, 
      limit 
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Get all class days across these sections for pagination
  const allClassDays = await prisma.classDay.findMany({
    where: { sectionId: { in: sectionIds } },
    orderBy: { date: 'desc' },
    select: { id: true, sectionId: true, date: true },
  });

  // Build unique date list (YYYY-MM-DD) across these classDays, sorted desc
  // Respect client timezone if provided via X-TZ-Offset (minutes offset from UTC)
  const tzHeader = request.headers.get('x-tz-offset');
  const tzMinutes = tzHeader ? parseInt(tzHeader, 10) : new Date().getTimezoneOffset();
  const toYmd = (d: Date) => {
    const localMs = d.getTime() - tzMinutes * 60 * 1000;
    return new Date(localMs).toISOString().slice(0, 10);
  };
  
  // Get unique dates and apply pagination
  const seen = new Set<string>();
  const uniqueDatesDesc: string[] = [];
  for (const cd of allClassDays) {
    const ymd = toYmd(cd.date);
    if (seen.has(ymd)) continue;
    seen.add(ymd);
    uniqueDatesDesc.push(ymd);
  }
  
  const totalDays = uniqueDatesDesc.length;
  const pageDates = uniqueDatesDesc.slice(offset, offset + limit);

  // Get class days for the paginated dates
  const classDays = allClassDays.filter(cd => {
    const ymd = toYmd(cd.date);
    return pageDates.includes(ymd);
  });

  // Attendance for this student for those class days
  const attendance = await prisma.attendanceRecord.findMany({
    where: { classDayId: { in: classDays.map((cd) => cd.id) }, studentId },
    select: { classDayId: true, status: true },
  });

  // Manual changes for this student
  const manualChanges = await prisma.manualStatusChange.findMany({
    where: { classDayId: { in: classDays.map((cd) => cd.id) }, studentId },
    include: { teacher: true },
  });

  const classDayById = new Map(classDays.map((cd) => [cd.id, cd]));
  const now = new Date();

  // Build per-section byDate map with application-level logic
  const records = sections.map((s) => {
    const byDate: Record<string, { status: string; originalStatus: string; isManual: boolean; manualChange: { status: string; teacherName: string; createdAt: string } | null }> = {};
    for (const ymd of pageDates) {
      // Find classDay for this section on this date (if none, status is BLANK)
      const cdForDate = classDays.find((cd) => cd.sectionId === s.id && toYmd(cd.date) === ymd);
      if (!cdForDate) {
        byDate[ymd] = { status: 'BLANK', originalStatus: 'BLANK', isManual: false, manualChange: null };
        continue;
      }
      
      const ar = attendance.find((a) => a.classDayId === cdForDate.id);
      const mc = manualChanges.find((m) => m.classDayId === cdForDate.id);
      const originalStatus = ar?.status || 'BLANK';
      
      // Application-level logic for determining effective status
      const effectiveStatus = (() => {
        if (mc) return mc.status; // Manual changes take precedence
        
        if (ar?.status) return ar.status; // Has attendance record
        
        // No attendance record - determine if this should be ABSENT
        const classDayDate = cdForDate.date;
        const enrollmentDate = s.enrolledAt;
        const isPastDate = classDayDate < now;
        
        // Compare dates at day level (ignore time and timezone)
        const classDayYmd = classDayDate.toISOString().split('T')[0];
        const enrollmentYmd = enrollmentDate.toISOString().split('T')[0];
        const wasEnrolled = classDayYmd >= enrollmentYmd;
        
        if (isPastDate && wasEnrolled) {
          return 'ABSENT'; // Past date, was enrolled, no record = ABSENT
        }
        
        return 'BLANK'; // Not enrolled yet or future date
      })();
      
      byDate[ymd] = {
        status: effectiveStatus,
        originalStatus,
        isManual: Boolean(mc),
        manualChange: mc
          ? {
              status: mc.status,
              teacherName: `${mc.teacher.firstName} ${mc.teacher.lastName}`,
              createdAt: mc.createdAt.toISOString(),
            }
          : null,
      };
    }
    return { sectionId: s.id, byDate };
  });

  return NextResponse.json(
    { 
      sections: sections.map(s => ({ id: s.id, title: s.title })), 
      days: pageDates.map((d) => ({ date: d })), 
      records,
      totalDays,
      offset,
      limit
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate', 'Pragma': 'no-cache', 'Vary': 'X-TZ-Offset' } }
  );
}


