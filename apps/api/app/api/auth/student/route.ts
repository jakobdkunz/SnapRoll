import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email: string };
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const student = await prisma.user.findFirst({ where: { email: cleanEmail, role: 'STUDENT' } });
  if (!student) {
    return NextResponse.json(
      { error: 'No student found with this email. Please ask your instructor to add you to a section.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ student });
}
