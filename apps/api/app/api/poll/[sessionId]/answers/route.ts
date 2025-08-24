import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const { studentId, optionIdx } = (await request.json()) as { studentId: string; optionIdx: number };
  if (!studentId || typeof optionIdx !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const session = await prisma.pollSession.findUnique({ where: { id: sessionId } });
  if (!session) return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  const options = JSON.parse(session.optionsJson) as string[];
  if (optionIdx < 0 || optionIdx >= options.length) {
    return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
  }
  const existed = await prisma.pollAnswer.findUnique({ where: { sessionId_studentId: { sessionId, studentId } } }).catch(async () => {
    // In case composite unique name differs, fallback lookup
    return prisma.pollAnswer.findFirst({ where: { sessionId, studentId } });
  });
  if (existed) return NextResponse.json({ error: 'You are only allowed to submit one answer' }, { status: 409 });
  await prisma.pollAnswer.create({ data: { sessionId, studentId, optionIdx } });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}


