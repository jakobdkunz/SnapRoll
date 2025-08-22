import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string; studentId: string } }) {
  const { firstName, lastName, email } = (await request.json()) as { firstName: string; lastName: string; email: string };
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'First name, last name, and email required' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  
  // Check if email is already taken by another student
  const existingStudent = await prisma.user.findFirst({
    where: { 
      email: cleanEmail, 
      role: 'STUDENT',
      id: { not: params.studentId }
    }
  });
  if (existingStudent) {
    return NextResponse.json({ error: 'Email already in use by another student' }, { status: 400 });
  }

  const student = await prisma.user.update({ 
    where: { id: params.studentId }, 
    data: { 
      firstName: firstName.trim(), 
      lastName: lastName.trim(),
      email: cleanEmail
    } 
  });
  return NextResponse.json({ student });
}

export async function DELETE(_: Request, { params }: { params: { id: string; studentId: string } }) {
  await prisma.enrollment.deleteMany({ where: { sectionId: params.id, studentId: params.studentId } });
  return NextResponse.json({ ok: true });
}
