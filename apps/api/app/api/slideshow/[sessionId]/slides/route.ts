import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { put, del as blobDel } from '@vercel/blob';

const putWithToken = async (key: string, data: Buffer, options: any) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
  return put(key, data, { ...options, token });
};

const delWithToken = async (url: string) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  try {
    await blobDel(url, { token });
  } catch {
    // best-effort
  }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const sessionId = params.sessionId;
    const session = await prisma.slideshowSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const slides = await prisma.slideshowSlide.findMany({ where: { sessionId }, orderBy: { index: 'asc' } });
    return NextResponse.json({ slides }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const sessionId = params.sessionId;
    const session = await prisma.slideshowSession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const form = await request.formData();
    const indexStr = (form.get('index') as string | null) || '';
    const widthStr = (form.get('width') as string | null) || '';
    const heightStr = (form.get('height') as string | null) || '';
    const index = Number.parseInt(indexStr, 10);
    const width = Number.isFinite(Number(widthStr)) ? Number(widthStr) : undefined;
    const height = Number.isFinite(Number(heightStr)) ? Number(heightStr) : undefined;
    if (!Number.isFinite(index) || index < 1) return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });
    if (!/png$/i.test(file.type)) return NextResponse.json({ error: 'file must be image/png' }, { status: 400 });
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `slides/rendered/${sessionId}/${index}.png`;
    const { url } = await putWithToken(key, buffer, { access: 'public', contentType: 'image/png', addRandomSuffix: false });
    // Upsert slide
    const slide = await prisma.slideshowSlide.upsert({
      where: { sessionId_index: { sessionId, index } },
      update: { imageUrl: url, width: width ?? null, height: height ?? null },
      create: { sessionId, index, imageUrl: url, width: width ?? null, height: height ?? null },
    });
    // Optionally bump totalSlides if index is the largest
    if (!session.totalSlides || index > session.totalSlides) {
      await prisma.slideshowSession.update({ where: { id: sessionId }, data: { totalSlides: index } }).catch(() => null);
    }
    return NextResponse.json({ ok: true, slide }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const sessionId = params.sessionId;
    const slides = await prisma.slideshowSlide.findMany({ where: { sessionId } });
    await prisma.slideshowSlide.deleteMany({ where: { sessionId } });
    // best-effort delete blobs
    await Promise.all(slides.map(s => delWithToken(s.imageUrl)));
    await prisma.slideshowSession.update({ where: { id: sessionId }, data: { totalSlides: null } }).catch(() => null);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


