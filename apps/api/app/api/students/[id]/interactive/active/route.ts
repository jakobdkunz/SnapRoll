import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;
  const enrollments = await prisma.enrollment.findMany({ where: { studentId }, select: { sectionId: true } });
  const sectionIds = enrollments.map((e) => e.sectionId);
  if (sectionIds.length === 0) return NextResponse.json({ interactive: null });

  const cutoff = new Date(Date.now() - 10_000);
  const session = await prisma.wordCloudSession.findFirst({
    where: { sectionId: { in: sectionIds }, closedAt: null, instructorLastSeenAt: { gt: cutoff } },
    orderBy: { createdAt: 'desc' },
  });
  if (!session) return NextResponse.json({ interactive: null });

  const answered = await prisma.wordCloudAnswer.findFirst({ where: { sessionId: session.id, studentId } });

  return NextResponse.json({
    interactive: {
      kind: 'wordcloud',
      sessionId: session.id,
      prompt: session.prompt,
      showPromptToStudents: session.showPromptToStudents,
      allowMultipleAnswers: session.allowMultipleAnswers,
      sectionId: session.sectionId,
      hasAnswered: !!answered,
    },
  });
}

