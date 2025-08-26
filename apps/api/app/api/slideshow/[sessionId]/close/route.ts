import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { del as blobDel } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_req: Request, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  await prisma.slideshowSession.updateMany({ where: { id: sessionId, closedAt: null }, data: { closedAt: new Date() } });
  // Best-effort: delete rendered slides
  const slides = await prisma.slideshowSlide.findMany({ where: { sessionId } });
  await prisma.slideshowSlide.deleteMany({ where: { sessionId } });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    await Promise.all(slides.map(s => blobDel(s.imageUrl, { token }).catch(() => null)));
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}


