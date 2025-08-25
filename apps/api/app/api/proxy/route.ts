import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAllowed(url: URL) {
  if (url.protocol !== 'https:') return false;
  // Allow Vercel Blob and common public hosts
  const host = url.hostname.toLowerCase();
  if (host.endsWith('.vercel-storage.com')) return true;
  if (host.endsWith('blob.vercel-storage.com')) return true;
  if (host === 'cdn.jsdelivr.net') return true;
  if (host === 'unpkg.com') return true;
  if (host === 'cdnjs.cloudflare.com') return true;
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
    
    console.log(`Proxy: Fetching ${parsed.toString()}`);
    
    const upstream = await fetch(parsed.toString(), { 
      cache: 'no-store', 
      redirect: 'follow',
      headers: {
        'User-Agent': 'SnapRoll-Proxy/1.0'
      }
    });
    
    console.log(`Proxy: Upstream response status: ${upstream.status} ${upstream.statusText}`);
    
    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => 'Unable to read error response');
      console.error(`Proxy: Upstream error - Status: ${upstream.status}, Text: ${errorText}`);
      return NextResponse.json({ 
        error: `Upstream ${upstream.status}: ${upstream.statusText}`,
        details: errorText
      }, { status: 502 });
    }
    
    const headers = new Headers(upstream.headers);
    headers.set('Cache-Control', 'no-store');
    // Remove any existing CORS headers from upstream - middleware handles them
    headers.delete('access-control-allow-origin');
    headers.delete('access-control-allow-methods');
    headers.delete('access-control-allow-headers');
    headers.delete('access-control-allow-credentials');
    headers.delete('access-control-max-age');
    headers.delete('content-encoding');
    headers.delete('transfer-encoding');
    headers.delete('content-length');
    
    const buf = await upstream.arrayBuffer();
    console.log(`Proxy: Successfully fetched ${buf.byteLength} bytes`);
    
    return new NextResponse(buf, { status: upstream.status, headers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Proxy error';
    console.error(`Proxy: Exception - ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


