import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const student = await prisma.user.findFirst({
    where: { email: cleanEmail, role: 'STUDENT' },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!student) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, student });
}


