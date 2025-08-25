import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAllowed(url: URL) {
  if (url.protocol !== 'https:') return false;
  // Allow Vercel Blob and common public hosts
  const host = url.hostname.toLowerCase();
  if (host.endsWith('.vercel-storage.com')) return true;
  if (host.endsWith('blob.vercel-storage.com')) return true;
  // Optionally allow other public CDNs
  return false;
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const target = u.searchParams.get('url');
    if (!target) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }
    if (!isAllowed(parsed)) return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    const upstream = await fetch(parsed.toString(), { cache: 'no-store' });
    if (!upstream.ok) return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
    const headers = new Headers(upstream.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('Access-Control-Allow-Origin', '*');
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


