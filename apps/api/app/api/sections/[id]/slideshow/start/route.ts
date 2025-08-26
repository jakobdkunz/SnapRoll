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
    let asset: any = null;
    let finalTitle = title;
    
    if (assetId) {
      // Reuse existing asset
      asset = await prisma.slideshowAsset.findUnique({ 
        where: { id: assetId },
        include: { slides: true }
      });
      if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      if (!title || title === 'Slideshow') finalTitle = asset.title;
    } else {
      // Create new asset from uploaded file
      const file = form.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 });
      
      const mime = file.type || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const key = `slides/assets/${Date.now()}-${file.name}`;
      const { url } = await putWithToken(key, buffer, { 
        access: 'public', 
        contentType: mime, 
        addRandomSuffix: false
      });
      
      // Create the asset
      asset = await prisma.slideshowAsset.create({
        data: {
          teacherId: (await prisma.section.findUnique({ where: { id: sectionId } }))?.teacherId!,
          title: finalTitle,
          filePath: url,
          mimeType: mime,
        }
      });
    }

    // No server-side conversion. Client-side will pre-render PPTX/PDF to PNGs.

    await prisma.slideshowSession.updateMany({ where: { sectionId, closedAt: null }, data: { closedAt: new Date() } });
    const session = await prisma.slideshowSession.create({
      data: {
        sectionId,
        assetId: asset.id,
        officeMode,
        showOnDevices,
        allowDownload,
        requireStay,
        preventJump,
        instructorLastSeenAt: new Date(),
      },
    });

    // If the asset has slides, copy them to the session
    if (asset.slides && asset.slides.length > 0) {
      const slideData = asset.slides.map(slide => ({
        sessionId: session.id,
        index: slide.index,
        imageUrl: slide.imageUrl,
        width: slide.width,
        height: slide.height,
      }));
      
      await prisma.slideshowSlide.createMany({
        data: slideData
      });
    }

    return NextResponse.json({ session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


