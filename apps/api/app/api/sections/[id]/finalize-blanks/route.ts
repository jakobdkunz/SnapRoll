import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

// Finalize all prior class days: any student without a recorded status becomes ABSENT
// This is now more comprehensive and handles all past dates, not just the most recent
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

    // All prior class days (not just the most recent)
    const priorDays = await prisma.classDay.findMany({
      where: { sectionId, date: { lt: todayStartUtc } },
      orderBy: { date: 'asc' },
      select: { id: true, date: true },
    });
    if (priorDays.length === 0) {
      return NextResponse.json({ created: 0 });
    }

    const priorIds = priorDays.map(d => d.id);

    // Get all enrollments with timestamps
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId },
      select: { studentId: true, createdAt: true },
    });
    if (enrollments.length === 0) {
      return NextResponse.json({ created: 0 });
    }

    // Create a map of student enrollment dates
    const enrollmentMap = new Map(enrollments.map(e => [e.studentId, e.createdAt]));

    // Get existing attendance records and manual changes for all prior days
    const [existingAttendance, existingManual] = await Promise.all([
      prisma.attendanceRecord.findMany({ 
        where: { classDayId: { in: priorIds } }, 
        select: { classDayId: true, studentId: true } 
      }),
      prisma.manualStatusChange.findMany({ 
        where: { classDayId: { in: priorIds } }, 
        select: { classDayId: true, studentId: true } 
      }),
    ]);

    // Create sets for quick lookup
    const existingAttendanceSet = new Set(existingAttendance.map(a => `${a.classDayId}:${a.studentId}`));
    const existingManualSet = new Set(existingManual.map(m => `${m.classDayId}:${m.studentId}`));

    // Prepare ABSENT records for missing pairs, considering enrollment dates
    const data: { classDayId: string; studentId: string; status: 'ABSENT' }[] = [];
    
    for (const classDay of priorDays) {
      for (const enrollment of enrollments) {
        const key = `${classDay.id}:${enrollment.studentId}`;
        
        // Skip if already has attendance record or manual change
        if (existingAttendanceSet.has(key) || existingManualSet.has(key)) {
          continue;
        }
        
        // Only create ABSENT record if student was enrolled on this class day
        if (classDay.date >= enrollment.createdAt) {
          data.push({ 
            classDayId: classDay.id, 
            studentId: enrollment.studentId, 
            status: 'ABSENT' 
          });
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


