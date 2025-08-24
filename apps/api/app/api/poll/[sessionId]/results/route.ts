import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const s = await prisma.pollSession.findUnique({ where: { id: params.sessionId } });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const options: string[] = JSON.parse(s.optionsJson);
  const answers = await prisma.pollAnswer.findMany({ where: { sessionId: s.id } });
  const counts = new Array(options.length).fill(0) as number[];
  for (const a of answers) {
    if (a.optionIdx >= 0 && a.optionIdx < counts.length) counts[a.optionIdx]++;
  }
  const total = answers.length;
  return NextResponse.json({ counts, total }, { headers: { 'Cache-Control': 'no-store' } });
}


