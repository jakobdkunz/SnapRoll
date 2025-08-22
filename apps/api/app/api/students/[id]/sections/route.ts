import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;
  // Sections the student is enrolled in
  const enrollments = await prisma.enrollment.findMany({ where: { studentId }, include: { section: true } });
  const sections = enrollments.map((e) => ({
    id: e.section.id,
    title: e.section.title,
    gradient: e.section.gradient ?? 'gradient-1',
  }));

  // Compute today's date (start of day) to find current classDays
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const classDays = await prisma.classDay.findMany({
    where: {
      sectionId: { in: sections.map((s) => s.id) },
      date: { gte: start, lt: end },
    },
    select: { id: true, sectionId: true },
  });

  const classDayIds = classDays.map((cd) => cd.id);
  const attendance = await prisma.attendanceRecord.findMany({
    where: { classDayId: { in: classDayIds }, studentId },
    select: { classDayId: true, status: true },
  });

  const checkedInSectionIds = new Set(
    attendance
      .filter((a) => a.status === 'PRESENT')
      .map((a) => classDays.find((cd) => cd.id === a.classDayId)?.sectionId)
      .filter((v): v is string => Boolean(v))
  );

  return NextResponse.json(
    { sections, checkedInSectionIds: Array.from(checkedInSectionIds) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
