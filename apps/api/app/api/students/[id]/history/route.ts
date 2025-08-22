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
// }
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;

  // Sections for this student
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { section: true },
    orderBy: { section: { title: 'asc' } },
  });
  const sections = enrollments.map((e) => ({ id: e.section.id, title: e.section.title }));
  const sectionIds = sections.map((s) => s.id);

  if (sectionIds.length === 0) {
    return NextResponse.json({ sections: [], days: [], records: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Get recent class days across these sections (limit to last 20 most recent class days overall)
  const classDays = await prisma.classDay.findMany({
    where: { sectionId: { in: sectionIds } },
    orderBy: { date: 'desc' },
    take: 20,
    select: { id: true, sectionId: true, date: true },
  });

  // Build unique date list (YYYY-MM-DD) across these classDays, sorted desc
  const toYmd = (d: Date) => d.toISOString().slice(0, 10);
  const uniqueDatesDesc = Array.from(
    new Set(classDays.map((cd) => toYmd(cd.date)))
  );

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

  // Build per-section byDate map
  const records = sections.map((s) => {
    const byDate: Record<string, { status: string; originalStatus: string; isManual: boolean; manualChange: { status: string; teacherName: string; createdAt: string } | null }> = {};
    for (const ymd of uniqueDatesDesc) {
      // Find classDay for this section on this date (if none, status is BLANK)
      const cdForDate = classDays.find((cd) => cd.sectionId === s.id && toYmd(cd.date) === ymd);
      if (!cdForDate) {
        byDate[ymd] = { status: 'BLANK', originalStatus: 'BLANK', isManual: false, manualChange: null };
        continue;
      }
      const ar = attendance.find((a) => a.classDayId === cdForDate.id);
      const mc = manualChanges.find((m) => m.classDayId === cdForDate.id);
      const originalStatus = ar?.status || 'BLANK';
      const effectiveStatus = mc ? mc.status : originalStatus;
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
    { sections, days: uniqueDatesDesc.map((d) => ({ date: d })), records },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}


