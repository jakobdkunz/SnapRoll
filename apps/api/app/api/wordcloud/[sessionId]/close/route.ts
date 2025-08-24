import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_request: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  await prisma.wordCloudSession.updateMany({ where: { id: sessionId, closedAt: null }, data: { closedAt: new Date() } });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
}


