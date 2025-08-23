import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

// Finalize all prior class days: any student without a recorded status becomes ABSENT
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const sectionId = params.id;

    // Determine start of "today" in client's local timezone (minutes offset from UTC)
    const tzHeader = request.headers.get('x-tz-offset');
    const tzMinutes = tzHeader ? parseInt(tzHeader, 10) : new Date().getTimezoneOffset();
    const now = new Date();
    const localNowMs = now.getTime() - tzMinutes * 60 * 1000;
    const localNow = new Date(localNowMs);
    const localMidnight = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
    const todayStartUtc = new Date(localMidnight.getTime() + tzMinutes * 60 * 1000);

    // All prior class days
    const priorDays = await prisma.classDay.findMany({
      where: { sectionId, date: { lt: todayStartUtc } },
      orderBy: { date: 'asc' },
      select: { id: true, date: true },
    });
    if (priorDays.length === 0) {
      return NextResponse.json({ created: 0 });
    }

    const priorIds = priorDays.map(d => d.id);
    const [existingAttendance, existingManual] = await Promise.all([
      prisma.attendanceRecord.findMany({ where: { classDayId: { in: priorIds } }, select: { classDayId: true } }),
      prisma.manualStatusChange.findMany({ where: { classDayId: { in: priorIds } }, select: { classDayId: true } }),
    ]);
    const daysWithAttendance = new Set(existingAttendance.map(a => a.classDayId));
    const daysWithManual = new Set(existingManual.map(m => m.classDayId));

    // Delete any prior day that has no attendance and no manual change (all BLANKs)
    const blankOnlyIds = priorDays
      .map(d => d.id)
      .filter(id => !daysWithAttendance.has(id) && !daysWithManual.has(id));
    if (blankOnlyIds.length > 0) {
      await prisma.classDay.deleteMany({ where: { id: { in: blankOnlyIds } } });
    }

    // Recompute latest remaining prior day after deletions
    const latestPrior = await prisma.classDay.findFirst({
      where: { sectionId, date: { lt: todayStartUtc } },
      orderBy: { date: 'desc' },
      select: { id: true },
    });
    if (!latestPrior) {
      return NextResponse.json({ created: 0 });
    }
    const classDayIds = [latestPrior.id];

    // All enrolled students for the section
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId },
      select: { studentId: true },
    });
    if (enrollments.length === 0) {
      return NextResponse.json({ created: 0 });
    }
    const studentIds = enrollments.map(e => e.studentId);

    // Existing attendance records for these days/students
    const existing = await prisma.attendanceRecord.findMany({
      where: { classDayId: { in: classDayIds }, studentId: { in: studentIds } },
      select: { classDayId: true, studentId: true },
    });
    const existingSet = new Set(existing.map(r => `${r.classDayId}:${r.studentId}`));

    // Prepare ABSENT records for missing pairs
    const data: { classDayId: string; studentId: string; status: 'ABSENT' }[] = [];
    for (const cdId of classDayIds) {
      for (const sId of studentIds) {
        const key = `${cdId}:${sId}`;
        if (!existingSet.has(key)) {
          data.push({ classDayId: cdId, studentId: sId, status: 'ABSENT' });
        }
      }
    }

    if (data.length === 0) {
      return NextResponse.json({ created: 0 });
    }

    const result = await prisma.attendanceRecord.createMany({ data, skipDuplicates: true });
    return NextResponse.json({ created: result.count });
  } catch (error) {
    console.error('finalize-blanks error', error);
    return NextResponse.json({ error: 'Failed to finalize blanks' }, { status: 500 });
  }
}


