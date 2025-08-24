import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  const assets = await prisma.slideshowAsset.findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ assets }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const teacherId = params.id;
  const form = await request.formData();
  const title = (form.get('title') as string | null)?.trim() || 'Slideshow';
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  if (process.env.VERCEL) {
    return NextResponse.json({ error: 'Uploads are not supported on this deployment. Please use a storage service.' }, { status: 400 });
  }
  const mimeType = file.type || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filePath = `/uploads/${Date.now()}-${file.name}`;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const abs = path.join(process.cwd(), 'public', filePath);
  try {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffer);
  } catch (e: unknown) {
    return NextResponse.json({ error: 'Failed to save upload. This environment may be read-only.' }, { status: 500 });
  }
  const asset = await prisma.slideshowAsset.create({ data: { teacherId, title, filePath, mimeType } });
  return NextResponse.json({ asset }, { headers: { 'Cache-Control': 'no-store' } });
}


