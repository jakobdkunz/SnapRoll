import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const sectionId = params.id;
  const { prompt, showPromptToStudents, allowMultipleAnswers } = (await request.json()) as {
    prompt: string;
    showPromptToStudents?: boolean;
    allowMultipleAnswers?: boolean;
  };
  if (!prompt || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  // Close any existing open sessions for this section
  await prisma.wordCloudSession.updateMany({
    where: { sectionId, closedAt: null },
    data: { closedAt: new Date() },
  });

  const session = await prisma.wordCloudSession.create({
    data: {
      sectionId,
      prompt: prompt.trim(),
      showPromptToStudents: showPromptToStudents ?? true,
      allowMultipleAnswers: allowMultipleAnswers ?? false,
      instructorLastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ session });
}

