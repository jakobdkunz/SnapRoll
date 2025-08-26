import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { put } from '@vercel/blob';

// Create a custom put function that always includes the token
const putWithToken = async (key: string, data: Buffer, options: any) => {
  let token = process.env.BLOB_READ_WRITE_TOKEN;
  
  // No fallback token - require environment variable
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
  }
  
  return put(key, data, { ...options, token });
};

// Initialize Vercel Blob with token
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const sectionId = params.id;
    const form = await request.formData();
    const title = (form.get('title') as string | null)?.trim() || 'Slideshow';
    const showOnDevices = (form.get('showOnDevices') as string) === 'true';
    const allowDownload = (form.get('allowDownload') as string) === 'true';
    const requireStay = (form.get('requireStay') as string) === 'true';
    const preventJump = (form.get('preventJump') as string) === 'true';
    const officeMode = (form.get('officeMode') as string) === 'true';
    const assetId = (form.get('assetId') as string | null) || null;
    let filePath: string;
    let mimeType: string;
    let finalTitle = title;
    if (assetId) {
      const asset = await prisma.slideshowAsset.findUnique({ where: { id: assetId } });
      if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      filePath = asset.filePath;
      mimeType = asset.mimeType;
      if (!title || title === 'Slideshow') finalTitle = asset.title;
    } else {
      const file = form.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 });
      const mime = file.type || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const key = `slides/session/${sectionId}/${Date.now()}-${file.name}`;
      const { url } = await putWithToken(key, buffer, { 
        access: 'public', 
        contentType: mime, 
        addRandomSuffix: false
      });
      filePath = url;
      mimeType = mime;
    }

    // No server-side conversion. Client-side will pre-render PPTX/PDF to PNGs.

    await prisma.slideshowSession.updateMany({ where: { sectionId, closedAt: null }, data: { closedAt: new Date() } });
    const session = await prisma.slideshowSession.create({
      data: {
        sectionId,
        title: finalTitle,
        filePath,
        mimeType,
        officeMode,
        showOnDevices,
        allowDownload,
        requireStay,
        preventJump,
        instructorLastSeenAt: new Date(),
      },
    });
    return NextResponse.json({ session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


