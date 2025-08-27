import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { del as blobDel } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_req: Request, { params }: { params: { sessionId: string } }) {
  await prisma.slideshowSession.update({ where: { id: params.sessionId }, data: { instructorLastSeenAt: new Date() } }).catch(() => null);
  // Best-effort cleanup: delete sessions not seen for 72h, along with rendered slides and blobs
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const expired = await prisma.slideshowSession.findMany({ where: { instructorLastSeenAt: { lt: cutoff } } });
  for (const s of expired) {
    const slides = await prisma.slideshowSlide.findMany({ where: { sessionId: s.id } });
    await prisma.slideshowSlide.deleteMany({ where: { sessionId: s.id } });
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      await Promise.all(slides.map(sl => blobDel(sl.imageUrl, { token }).catch(() => null)));
    }
  }
  await prisma.slideshowSession.deleteMany({ where: { instructorLastSeenAt: { lt: cutoff } } }).catch(() => null);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}


