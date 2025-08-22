import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function POST(request: Request) {
  const { code, studentId } = (await request.json()) as { code: string; studentId: string };
  if (!/^[0-9]{4}$/.test(code)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  
  const now = new Date();
  const classDay = await prisma.classDay.findFirst({ 
    where: { 
      attendanceCode: code,
      // Code must be set and not expired
      attendanceCodeExpiresAt: { gt: now },
    }
  });
  if (!classDay) return NextResponse.json({ ok: false, error: 'Code not found or expired' }, { status: 404 });

  const enrollment = await prisma.enrollment.findFirst({ 
    where: { sectionId: classDay.sectionId, studentId } 
  });
  
  if (!enrollment) {
    return NextResponse.json(
      { ok: false, error: 'You are not enrolled in this section. Please ask your instructor to add you first.' },
      { status: 403 }
    );
  }

  const record = await prisma.attendanceRecord.upsert({
    where: { classDayId_studentId: { classDayId: classDay.id, studentId } },
    update: { status: 'PRESENT' },
    create: { classDayId: classDay.id, studentId, status: 'PRESENT' },
  });

  const section = await prisma.section.findUnique({ where: { id: classDay.sectionId }, select: { id: true, title: true } });
  
  return NextResponse.json({ ok: true, record, status: 'PRESENT', section });
}
