import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@flamelink/convex-client/server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import type { Id } from '@flamelink/convex-client';

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  return url;
}

export const POST = withAuth(async (req: Request, { session, params }: { session: { accessToken?: string } | null; params: { sessionId: string } }) => {
  try {
    const accessToken = session?.accessToken;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file');
    const indexRaw = form.get('index');
    const widthRaw = form.get('width');
    const heightRaw = form.get('height');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    const index = Number(indexRaw || '');
    const width = widthRaw ? Number(widthRaw) : undefined;
    const height = heightRaw ? Number(heightRaw) : undefined;
    if (!Number.isFinite(index) || index <= 0) return NextResponse.json({ error: 'Invalid index' }, { status: 400 });

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not configured' }, { status: 500 });

    const uploaded = await put(`slides/sessions/${params.sessionId}/${index}.png`, file, {
      access: 'public',
      token: blobToken,
      contentType: 'image/png',
    });

    const convex = new ConvexHttpClient(getConvexUrl());
    convex.setAuth(accessToken);
    await convex.mutation(api.functions.slideshow.addSlide, {
      sessionId: params.sessionId as Id<'slideshowSessions'>,
      index,
      imageUrl: uploaded.url,
      width,
      height,
    });

    return NextResponse.json({ ok: true, url: uploaded.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const GET = withAuth(async (_req: Request, { session, params }: { session: { accessToken?: string } | null; params: { sessionId: string } }) => {
  try {
    const accessToken = session?.accessToken;
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const convex = new ConvexHttpClient(getConvexUrl());
    convex.setAuth(accessToken);
    const slides = await convex.query(api.functions.slideshow.getSlides, { sessionId: params.sessionId as Id<'slideshowSessions'> });
    const res = NextResponse.json({ slides });
    // Allow brief caching at the edge to reduce hot GET costs; revalidate quickly
    res.headers.set('Cache-Control', 'public, max-age=5, s-maxage=15, stale-while-revalidate=30');
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch slides';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
