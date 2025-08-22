import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { classDayId, studentId, status, teacherId } = await request.json();
  
  if (!classDayId || !studentId || !status || !teacherId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate that the teacher owns this section
  const section = await prisma.section.findFirst({
    where: { 
      id: params.id,
      teacherId: teacherId 
    }
  });
  
  if (!section) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Validate that the class day belongs to this section
  const classDay = await prisma.classDay.findFirst({
    where: { 
      id: classDayId,
      sectionId: params.id 
    }
  });
  
  if (!classDay) {
    return NextResponse.json({ error: 'Class day not found' }, { status: 404 });
  }

  // Validate that the student is enrolled in this section
  const enrollment = await prisma.enrollment.findFirst({
    where: { 
      sectionId: params.id,
      studentId: studentId 
    }
  });
  
  if (!enrollment) {
    return NextResponse.json({ error: 'Student not enrolled in this section' }, { status: 400 });
  }

  // Check if status is BLANK - only allow if original status was BLANK
  if (status === 'BLANK') {
    const originalRecord = await prisma.attendanceRecord.findFirst({
      where: { classDayId, studentId }
    });
    
    if (originalRecord && originalRecord.status !== 'BLANK') {
      return NextResponse.json({ 
        error: 'Cannot change to BLANK unless original status was BLANK' 
      }, { status: 400 });
    }
  }

  // Upsert the manual status change
  const manualChange = await prisma.manualStatusChange.upsert({
    where: {
      classDayId_studentId: { classDayId, studentId }
    },
    update: {
      status,
      teacherId,
      createdAt: new Date()
    },
    create: {
      classDayId,
      studentId,
      status,
      teacherId
    },
    include: {
      teacher: true
    }
  });

  return NextResponse.json({
    manualChange: {
      status: manualChange.status,
      teacherName: `${manualChange.teacher.firstName} ${manualChange.teacher.lastName}`,
      createdAt: manualChange.createdAt,
    }
  });
}
