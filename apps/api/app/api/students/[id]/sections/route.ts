import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;
  // Sections the student is enrolled in
  const enrollments = await prisma.enrollment.findMany({ where: { studentId }, include: { section: true } });
  const sections = enrollments.map((e) => ({
    id: e.section.id,
    title: e.section.title,
    gradient: e.section.gradient ?? 'gradient-1',
  }));

  // Compute today's date (start of day) respecting client timezone offset if provided
  const tzHeader = request.headers.get('x-tz-offset');
  const tzMinutes = tzHeader ? parseInt(tzHeader, 10) : new Date().getTimezoneOffset();
  const now = new Date();
  const localNowMs = now.getTime() - tzMinutes * 60 * 1000;
  const local = new Date(localNowMs);
  const startLocal = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  const start = new Date(startLocal.getTime() + tzMinutes * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

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
    { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } }
  );
}
