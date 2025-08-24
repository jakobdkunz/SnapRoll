import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { put } from '@vercel/blob';

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
  const mimeType = file.type || 'application/octet-stream';
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = `slides/${teacherId}/${Date.now()}-${file.name}`;
  const { url } = await put(key, buffer, { access: 'public', contentType: mimeType, addRandomSuffix: false });
  const asset = await prisma.slideshowAsset.create({ data: { teacherId, title, filePath: url, mimeType } });
  return NextResponse.json({ asset }, { headers: { 'Cache-Control': 'no-store' } });
}


