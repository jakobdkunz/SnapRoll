import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  const { slide } = (await request.json()) as { slide: number };
  if (!Number.isFinite(slide) || slide < 1) return NextResponse.json({ error: 'Invalid slide' }, { status: 400 });
  const updated = await prisma.slideshowSession.update({ where: { id: params.sessionId }, data: { currentSlide: slide, instructorLastSeenAt: new Date() } });
  return NextResponse.json({ ok: true, currentSlide: updated.currentSlide }, { headers: { 'Cache-Control': 'no-store' } });
}


