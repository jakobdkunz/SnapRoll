import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const sectionId = params.id;
  
  // Get today's class day
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
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
