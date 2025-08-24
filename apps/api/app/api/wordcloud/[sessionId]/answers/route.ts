import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const { studentId, text } = (await request.json()) as { studentId: string; text: string };
  if (!studentId || !text || text.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const session = await prisma.wordCloudSession.findUnique({ where: { id: sessionId } });
  if (!session || session.closedAt) return NextResponse.json({ error: 'Session not active' }, { status: 400 });

  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  // If multiple answers are not allowed, block any subsequent submissions in this session
  if (!session.allowMultipleAnswers) {
    const exists = await prisma.wordCloudAnswer.findFirst({ where: { sessionId, studentId } });
    if (exists) return NextResponse.json({ error: 'You have already answered.' }, { status: 409 });
  }

  // Prevent exact duplicate normalized text per student as well
  const duplicate = await prisma.wordCloudAnswer.findUnique({
    where: { sessionId_studentId_text: { sessionId, studentId, text: normalized } },
  });
  if (duplicate) return NextResponse.json({ error: 'You already submitted that answer.' }, { status: 409 });

  await prisma.wordCloudAnswer.create({ data: { sessionId, studentId, text: normalized } });

  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const answers = await prisma.wordCloudAnswer.findMany({ where: { sessionId }, select: { text: true } });
  const counts = new Map<string, number>();
  for (const a of answers) {
    const key = a.text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const words = Array.from(counts.entries()).map(([word, count]) => ({ word, count }));
  words.sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  return NextResponse.json({ words });
}

