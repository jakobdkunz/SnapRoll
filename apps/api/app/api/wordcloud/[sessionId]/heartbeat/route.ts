import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_request: Request, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const session = await prisma.wordCloudSession.update({
    where: { id: sessionId },
    data: { instructorLastSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true, session });
}

