import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const student = await prisma.user.findUnique({ where: { id: params.id } });
  if (!student || student.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }
  return NextResponse.json({
    student: {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
    },
  });
}
