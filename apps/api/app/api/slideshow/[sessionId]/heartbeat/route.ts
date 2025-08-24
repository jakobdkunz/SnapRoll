import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_req: Request, { params }: { params: { sessionId: string } }) {
  await prisma.slideshowSession.update({ where: { id: params.sessionId }, data: { instructorLastSeenAt: new Date() } }).catch(() => null);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}


