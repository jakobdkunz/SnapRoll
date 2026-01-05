import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@flamelink/convex-client/server';
import { getAccessToken } from '@workos-inc/authkit-nextjs';

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  return url;
}

export async function POST(req: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const titleRaw = form.get('title');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const title = typeof titleRaw === 'string' && titleRaw.trim().length > 0 ? titleRaw.trim() : file.name;
    const contentType = file.type || 'application/pdf';
    if (!/pdf/i.test(contentType)) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not configured' }, { status: 500 });
    }

    const uploaded = await put(`slides/assets/${Date.now()}-${file.name}`.replace(/\s+/g, '-'), file, {
      access: 'public',
      token: blobToken,
      contentType,
      addRandomSuffix: true,
    });

    const convex = new ConvexHttpClient(getConvexUrl());
    convex.setAuth(accessToken);

    const assetId = await convex.mutation(api.functions.slideshow.createAsset, {
      title,
      filePath: uploaded.url,
      mimeType: contentType,
    });

    return NextResponse.json({ assetId, url: uploaded.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
