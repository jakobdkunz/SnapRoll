import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const sectionId = params.id;
  
  // Get today's class day, respecting client timezone if provided (minutes offset from UTC)
  const tzHeader = request.headers.get('x-tz-offset');
  const tzMinutes = tzHeader ? parseInt(tzHeader, 10) : new Date().getTimezoneOffset();
  const now = new Date();
  const localNowMs = now.getTime() - tzMinutes * 60 * 1000;
  const local = new Date(localNowMs);
  const startLocal = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  const start = new Date(startLocal.getTime() + tzMinutes * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  
  const classDay = await prisma.classDay.findFirst({
    where: { sectionId, date: { gte: start, lt: end } },
  });

  if (!classDay) {
    return NextResponse.json({ 
      hasActiveAttendance: false,
      totalStudents: 0,
      checkedIn: 0,
      progress: 0,
      attendanceCode: null
    });
  }

  // Get total enrolled students
  const totalStudents = await prisma.enrollment.count({ where: { sectionId } });
  
  // Get checked in students
  const checkedIn = await prisma.attendanceRecord.count({
    where: { classDayId: classDay.id, status: 'PRESENT' }
  });

  const progress = totalStudents > 0 ? (checkedIn / totalStudents) * 100 : 0;

  return NextResponse.json({
    hasActiveAttendance: true,
    totalStudents,
    checkedIn,
    progress: Math.round(progress),
    attendanceCode: classDay.attendanceCode
  });
}
