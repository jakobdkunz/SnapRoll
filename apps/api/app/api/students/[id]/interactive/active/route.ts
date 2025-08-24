import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const studentId = params.id;
  const enrollments = await prisma.enrollment.findMany({ where: { studentId }, select: { sectionId: true } });
  const sectionIds = enrollments.map((e) => e.sectionId);
  if (sectionIds.length === 0) return NextResponse.json({ interactive: null });

  const cutoff = new Date(Date.now() - 15_000);
  const session = await prisma.wordCloudSession.findFirst({
    where: { sectionId: { in: sectionIds }, closedAt: null, instructorLastSeenAt: { gt: cutoff } },
    orderBy: { createdAt: 'desc' },
  });
  if (session) {
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

  // Fallback to Poll sessions
  const poll = await prisma.pollSession.findFirst({
    where: { sectionId: { in: sectionIds }, closedAt: null, instructorLastSeenAt: { gt: cutoff } },
    orderBy: { createdAt: 'desc' },
  });
  if (poll) {
    const answered = await prisma.pollAnswer.findFirst({ where: { sessionId: poll.id, studentId } });
    return NextResponse.json({
      interactive: {
        kind: 'poll',
        sessionId: poll.id,
        prompt: poll.prompt,
        options: JSON.parse(poll.optionsJson) as string[],
        showResults: poll.showResults,
        sectionId: poll.sectionId,
        hasAnswered: !!answered,
      },
    });
  }

  // Fallback to Slideshow sessions
  const slide = await prisma.slideshowSession.findFirst({
    where: { sectionId: { in: sectionIds }, closedAt: null, instructorLastSeenAt: { gt: cutoff } },
    orderBy: { createdAt: 'desc' },
  });
  if (slide) {
    return NextResponse.json({
      interactive: {
        kind: 'slideshow',
        sessionId: slide.id,
        title: slide.title,
        filePath: slide.filePath,
        mimeType: slide.mimeType,
        currentSlide: slide.currentSlide,
        totalSlides: slide.totalSlides ?? null,
        showOnDevices: slide.showOnDevices,
        allowDownload: slide.allowDownload,
        requireStay: slide.requireStay,
        preventJump: slide.preventJump,
        sectionId: slide.sectionId,
      },
    });
  }

  return NextResponse.json({ interactive: null });
}

