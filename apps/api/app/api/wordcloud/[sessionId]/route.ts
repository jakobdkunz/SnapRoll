import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const session = await prisma.wordCloudSession.findUnique({
    where: { id: params.sessionId },
    select: {
      id: true,
      prompt: true,
      showPromptToStudents: true,
      allowMultipleAnswers: true,
      createdAt: true,
      closedAt: true,
    },
  });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
}


