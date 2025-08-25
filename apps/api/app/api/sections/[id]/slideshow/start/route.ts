import { NextResponse } from 'next/server';
import { prisma } from '@snaproll/lib/db';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function convertWithGotenberg(originalUrl: string): Promise<{ pdfUrl: string } | null> {
  const base = process.env.GOTENBERG_URL;
  if (!base) return null;
  try {
    const fileResp = await fetch(originalUrl);
    if (!fileResp.ok) throw new Error('Failed to download source file');
    const arrayBuffer = await fileResp.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const form = new FormData();
    form.append('files', blob, 'slides.pptx');
    const resp = await fetch(`${base.replace(/\/$/, '')}/forms/libreoffice/convert`, { method: 'POST', body: form });
    if (!resp.ok) throw new Error(`Gotenberg convert failed: ${resp.status}`);
    const pdfBuffer = Buffer.from(await resp.arrayBuffer());
    const key = `slides/converted/${Date.now()}-converted.pdf`;
    const { url } = await put(key, pdfBuffer, { access: 'public', contentType: 'application/pdf', addRandomSuffix: false });
    return { pdfUrl: url };
  } catch (_e) {
    return null;
  }
}

async function convertPptLikeToPdf(originalUrl: string): Promise<{ pdfUrl: string } | null> {
  const token = process.env.CLOUDCONVERT_API_KEY;
  if (!token) return null;
  try {
    // Create job: import-url -> convert (to pdf) -> export-url
    const createRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-my-file': {
            operation: 'import/url',
            url: originalUrl,
          },
          'convert-to-pdf': {
            operation: 'convert',
            input: 'import-my-file',
            output_format: 'pdf',
          },
          'export-result': {
            operation: 'export/url',
            input: 'convert-to-pdf',
          },
        },
      }),
    });
    if (!createRes.ok) throw new Error(`CloudConvert create failed: ${createRes.status}`);
    let job = await createRes.json();
    const jobId = job?.data?.id as string | undefined;
    if (!jobId) throw new Error('CloudConvert job id missing');
    // Poll until finished
    for (let i = 0; i < 120; i++) {
      const jobRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!jobRes.ok) throw new Error(`CloudConvert poll failed: ${jobRes.status}`);
      job = await jobRes.json();
      const status = job?.data?.status;
      if (status === 'finished') break;
      if (status === 'error') throw new Error('CloudConvert job error');
      await new Promise((r) => setTimeout(r, 1000));
    }
    const tasks: any[] = job?.data?.tasks || [];
    const exportTask = tasks.find((t) => t.name === 'export-result' && t.result?.files?.length);
    const resultUrl = exportTask?.result?.files?.[0]?.url as string | undefined;
    if (!resultUrl) throw new Error('CloudConvert export url missing');
    // Download and upload to Blob
    const resp = await fetch(resultUrl);
    if (!resp.ok) throw new Error('Download of converted PDF failed');
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `slides/converted/${Date.now()}-converted.pdf`;
    const { url } = await put(key, buffer, { access: 'public', contentType: 'application/pdf', addRandomSuffix: false });
    return { pdfUrl: url };
  } catch (_e) {
    return null;
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const sectionId = params.id;
    const form = await request.formData();
    const title = (form.get('title') as string | null)?.trim() || 'Slideshow';
    const showOnDevices = (form.get('showOnDevices') as string) === 'true';
    const allowDownload = (form.get('allowDownload') as string) === 'true';
    const requireStay = (form.get('requireStay') as string) === 'true';
    const preventJump = (form.get('preventJump') as string) === 'true';
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
      const { url } = await put(key, buffer, { access: 'public', contentType: mime, addRandomSuffix: false });
      filePath = url;
      mimeType = mime;
    }

    // If PPT/PPTX, convert to PDF when possible for pre-rendered control
    const isPptLike = /(powerpoint|\.pptx?$)/i.test(mimeType) || /\.pptx?$/i.test(filePath);
    if (isPptLike) {
      // Try free self-hosted Gotenberg first, then CloudConvert fallback
      const convertedFree = await convertWithGotenberg(filePath);
      const converted = convertedFree ?? (await convertPptLikeToPdf(filePath));
      if (converted && converted.pdfUrl) {
        filePath = converted.pdfUrl;
        mimeType = 'application/pdf';
      }
    }

    await prisma.slideshowSession.updateMany({ where: { sectionId, closedAt: null }, data: { closedAt: new Date() } });
    const session = await prisma.slideshowSession.create({
      data: {
        sectionId,
        title: finalTitle,
        filePath,
        mimeType,
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


