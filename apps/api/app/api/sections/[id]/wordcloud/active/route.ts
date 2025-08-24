import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const sectionId = params.id;
  const now = Date.now();
  const activeWindowMs = 10_000;
  const cutoff = new Date(now - activeWindowMs);
  const session = await prisma.wordCloudSession.findFirst({
    where: { sectionId, closedAt: null, instructorLastSeenAt: { gt: cutoff } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ session: session ?? null }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
}

