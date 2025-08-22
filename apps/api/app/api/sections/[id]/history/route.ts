import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  // Get all class days for this section
  const classDays = await prisma.classDay.findMany({
    where: { sectionId: id },
    orderBy: { date: 'desc' },
  });

  // Get all students enrolled in this section
  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId: id },
    include: { student: true },
    orderBy: [
      { student: { lastName: 'asc' } },
      { student: { firstName: 'asc' } }
    ]
  });

  // Get all attendance records for this section
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: { classDay: { sectionId: id } },
    include: { classDay: true }
  });

  // Get all manual status changes for this section
  const manualChanges = await prisma.manualStatusChange.findMany({
    where: { classDay: { sectionId: id } },
    include: { 
      classDay: true,
      teacher: true
    }
  });

  // Create a map for quick lookup of manual changes
  const manualChangeMap = new Map();
  manualChanges.forEach(change => {
    const key = `${change.classDayId}-${change.studentId}`;
    manualChangeMap.set(key, change);
  });

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
        const attendanceRecord = attendanceRecords.find(
          ar => ar.classDayId === classDay.id && ar.studentId === enrollment.studentId
        );
        
        const manualChange = manualChangeMap.get(`${classDay.id}-${enrollment.studentId}`);
        
        // Determine effective status: manual change takes precedence
        const effectiveStatus = manualChange ? manualChange.status : (attendanceRecord?.status || 'BLANK');
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
  };

  return NextResponse.json(history);
}
