import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_req: Request, { params }: { params: { sessionId: string } }) {
  const s = await prisma.pollSession.findUnique({ where: { id: params.sessionId } });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await prisma.pollSession.update({ where: { id: s.id }, data: { showResults: !s.showResults, instructorLastSeenAt: new Date() } });
  return NextResponse.json({ ok: true, showResults: updated.showResults }, { headers: { 'Cache-Control': 'no-store' } });
}


