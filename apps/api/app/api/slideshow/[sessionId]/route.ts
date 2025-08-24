import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  const s = await prisma.slideshowSession.findUnique({ where: { id: params.sessionId } });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    id: s.id,
    title: s.title,
    filePath: s.filePath,
    mimeType: s.mimeType,
    totalSlides: s.totalSlides ?? null,
    currentSlide: s.currentSlide,
    showOnDevices: s.showOnDevices,
    allowDownload: s.allowDownload,
    requireStay: s.requireStay,
    preventJump: s.preventJump,
  }, { headers: { 'Cache-Control': 'no-store' } });
}


