"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
import { apiFetch, getApiBaseUrl } from '@snaproll/api-client';

type SessionDetails = {
  id: string;
  title: string;
  filePath: string;
  mimeType: string;
  totalSlides: number | null;
  currentSlide: number;
  showOnDevices: boolean;
  allowDownload: boolean;
  requireStay: boolean;
  preventJump: boolean;
};

type Slide = { id: string; index: number; imageUrl: string; width?: number | null; height?: number | null };

export default function SlideshowPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [working, setWorking] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderMsg, setRenderMsg] = useState('');
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [debug, setDebug] = useState('');

  const renderHostRef = useRef<HTMLDivElement | null>(null);

  // Load session details
  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const data = await apiFetch<SessionDetails>(`/api/slideshow/${sessionId}`);
        if (cancelled) return;
        setDetails(data);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Session not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSession();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Load current slides list
  useEffect(() => {
    let cancelled = false;
    async function loadSlides() {
      try {
        const res = await apiFetch<{ slides: Slide[] }>(`/api/slideshow/${sessionId}/slides`);
        if (cancelled) return;
        setSlides(res.slides);
      } catch {
        // ignore
      }
    }
    loadSlides();
    const id = window.setInterval(loadSlides, 5000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [sessionId]);

  // Heartbeat
  useEffect(() => {
    const id = window.setInterval(() => { void apiFetch(`/api/slideshow/${sessionId}/heartbeat`, { method: 'POST' }); }, 5000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  const rawFileUrl = details?.filePath;
  const isPdf = !!details && /pdf/i.test(details.mimeType);
  const isPpt = !!details && (/(powerpoint|\.pptx?$)/i.test(details.mimeType) || /\.pptx?$/i.test(details.filePath));
  const proxiedFileUrl = useMemo(() => {
    if (!rawFileUrl) return '';
    try {
      const u = new URL(rawFileUrl);
      const host = u.hostname.toLowerCase();
      if (host.endsWith('.vercel-storage.com') || host.endsWith('blob.vercel-storage.com')) {
        const api = getApiBaseUrl().replace(/\/$/, '');
        return `${api}/api/proxy?url=${encodeURIComponent(rawFileUrl)}`;
      }
      return rawFileUrl;
    } catch {
      return rawFileUrl;
    }
  }, [rawFileUrl]);

  const pptxSourceUrl = useMemo(() => {
    // Prefer API proxy (solves CORS) and fall back to raw URL
    return proxiedFileUrl || rawFileUrl || '';
  }, [proxiedFileUrl, rawFileUrl]);

  async function gotoSlide(slideNumber: number) {
    if (working || !details) return;
    setWorking(true);
    try {
      await apiFetch(`/api/slideshow/${sessionId}/goto`, { method: 'POST', body: JSON.stringify({ slide: slideNumber }) });
      setDetails(prev => prev ? { ...prev, currentSlide: slideNumber } : prev);
    } catch (e) {
      console.error('Failed to goto slide:', e);
    } finally {
      setWorking(false);
    }
  }

  async function closeAndBack() {
    if (working) return;
    setWorking(true);
    try {
      await apiFetch(`/api/slideshow/${sessionId}/close`, { method: 'POST' });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setWorking(false);
    }
  }

  // Helpers to load scripts
  async function loadScript(src: string) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  async function ensureHtml2Canvas() {
    const w = window as unknown as { html2canvas?: any };
    if (!w.html2canvas) {
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
    }
  }

  async function ensurePptxLibs() {
    const addLog = (m: string) => setRenderLogs((prev) => [...prev, m]);
    // CSS
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    if (!links.some((l) => l.href.endsWith('/vendor/reveal.css'))) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/vendor/reveal.css';
      document.head.appendChild(link);
      addLog('Loaded reveal.css');
    }
    if (!links.some((l) => l.href.endsWith('/vendor/pptxjs.css'))) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/vendor/pptxjs.css';
      document.head.appendChild(link);
      addLog('Loaded pptxjs.css');
    }
    const anyWin = window as unknown as { jQuery?: any; $?: any; JSZip?: any; Reveal?: any };
    if (!anyWin.jQuery) { await loadScript('/vendor/jquery.min.js').catch((e) => { console.error(e); throw e; }); addLog('Loaded jQuery'); }
    if (!anyWin.JSZip) { await loadScript('/vendor/jszip.min.js').catch((e) => { console.error(e); throw e; }); addLog('Loaded JSZip'); }
    if (!anyWin.Reveal) { await loadScript('/vendor/reveal.js').catch((e) => { console.error(e); throw e; }); addLog('Loaded Reveal.js'); }
    if (!anyWin.$ && anyWin.jQuery) anyWin.$ = anyWin.jQuery;
    const w = window as any;
    w.FileReaderJS = w.FileReaderJS || {};
    w.FileReaderJS.setSync = w.FileReaderJS.setSync || function(){};
    w.FileReaderJS.setupBlob = w.FileReaderJS.setupBlob || function(){};
    const hasPlugin = !!(anyWin.$ && anyWin.$.fn && anyWin.$.fn.pptxToHtml);
    if (!hasPlugin) {
      await loadScript('/vendor/pptxjs.min.js').catch((e) => { console.error(e); throw e; }); addLog('Loaded pptxjs');
      await loadScript('/vendor/divs2slides.min.js').catch((e) => { console.error(e); throw e; }); addLog('Loaded divs2slides');
    }
  }

  async function ensurePdfJs() {
    const anyWin = window as any;
    if (!anyWin.pdfjsLib) {
      // Use legacy UMD build which exposes window.pdfjsLib
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js');
    }
    const pdfjsLib = (window as any).pdfjsLib;
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }
  }

  async function uploadPng(index: number, blob: Blob, width?: number, height?: number) {
    const fd = new FormData();
    fd.append('index', String(index));
    if (width) fd.append('width', String(width));
    if (height) fd.append('height', String(height));
    fd.append('file', blob, `${index}.png`);
    await fetch(`${getApiBaseUrl().replace(/\/$/, '')}/api/slideshow/${sessionId}/slides`, { method: 'POST', body: fd, credentials: 'include' });
  }

  async function renderPdfToPngs() {
    setRendering(true);
    setRenderMsg('Loading PDF…');
    try {
      await ensurePdfJs();
      const pdfjsLib = (window as any).pdfjsLib;
      const doc = await pdfjsLib.getDocument({ url: proxiedFileUrl, withCredentials: true }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        setRenderMsg(`Rendering slide ${i}/${doc.numPages}…`);
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/png'));
        await uploadPng(i, blob, canvas.width, canvas.height);
      }
      setRenderMsg('Done. Refreshing…');
      const res = await apiFetch<{ slides: Slide[] }>(`/api/slideshow/${sessionId}/slides`);
      setSlides(res.slides);
      // Set total slides for UI
      setDetails(prev => prev ? { ...prev, totalSlides: res.slides.length } : prev);
    } catch (e) {
      setError((e as Error)?.message || 'Failed to render PDF');
    } finally {
      setRendering(false);
      setRenderMsg('');
    }
  }

  async function renderPptxToPngs() {
    setRendering(true);
    setRenderMsg('Loading PowerPoint…');
    setRenderLogs([]);
    try {
      // Intercept errors during render
      const captured: string[] = [];
      const addLog = (m: string) => { captured.push(m); setRenderLogs((prev) => [...prev, m]); };
      const origError = console.error;
      const origWarn = console.warn;
      let errHandler: ((e: ErrorEvent) => void) | null = null;
      let rejHandler: ((e: PromiseRejectionEvent) => void) | null = null;
      (console as any).error = (...args: any[]) => { try { addLog(`console.error: ${args.map(String).join(' ')}`); } catch {} origError.apply(console, args as any); };
      ;(console as any).warn = (...args: any[]) => { try { addLog(`console.warn: ${args.map(String).join(' ')}`); } catch {} origWarn.apply(console, args as any); };
      errHandler = (e: ErrorEvent) => addLog(`window.error: ${e.message}`);
      rejHandler = (e: PromiseRejectionEvent) => addLog(`unhandledrejection: ${e.reason?.message || String(e.reason)}`);
      window.addEventListener('error', errHandler);
      window.addEventListener('unhandledrejection', rejHandler);
      await ensurePptxLibs();
      await ensureHtml2Canvas();
      // Quick reachability test for the PPTX file
      const testUrl = pptxSourceUrl;
      if (!testUrl) throw new Error('No file URL found');
      try {
        const testResp = await fetch(testUrl, { method: 'HEAD', credentials: 'include' as RequestCredentials });
        if (!testResp.ok) throw new Error(`File not reachable (status ${testResp.status})`);
        const ctype = testResp.headers.get('content-type') || '';
        addLog(`HEAD ok; content-type: ${ctype}`);
      } catch (e) {
        throw new Error(`Unable to load PPTX. ${e instanceof Error ? e.message : ''}`);
      }
      const host = document.createElement('div');
      // Make it participate in layout with a known size; fully invisible to user
      host.style.position = 'fixed';
      host.style.top = '0';
      host.style.left = '0';
      host.style.width = '1280px';
      host.style.height = '720px';
      host.style.opacity = '0';
      host.style.pointerEvents = 'none';
      host.style.background = '#fff';
      (renderHostRef.current || document.body).appendChild(host);
      const $ = (window as any).jQuery as any;
      const pluginExists = $ && $.fn && $.fn.pptxToHtml;
      if (!pluginExists) throw new Error('PPTX renderer not available');
      let rendered = false;
      async function tryRenderWithUrl(url: string): Promise<void> {
        addLog(`Rendering via URL: ${url.substring(0, 80)}…`);
        $(host).pptxToHtml({
          pptxFileUrl: url,
          slideMode: true,
          slidesScale: '100%',
          keyBoardShortCut: false,
          mediaProcess: true,
          slideType: 'revealjs',
          revealjsPath: '/vendor/',
          revealjsConfig: { controls: false, progress: false, embedded: true, width: 1280, height: 720 },
          after: () => { /* not all builds call after reliably */ },
        });
        // Wait for Reveal DOM to appear (fallback readiness signal)
        const start = Date.now();
        while (Date.now() - start < 15000) {
          const hasReveal = host.querySelector('.reveal .slides section');
          if (hasReveal) { addLog('Reveal DOM detected'); return; }
          await new Promise((r) => setTimeout(r, 250));
        }
        const innerLen = host.innerHTML.length;
        addLog(`Renderer did not initialize; host.innerHTML length=${innerLen}`);
        throw new Error('Renderer did not initialize');
      }
      // First attempt: use (proxied) URL
      await Promise.race([
        (async () => { await tryRenderWithUrl(pptxSourceUrl); rendered = true; })(),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timed out loading PPTX via URL')), 15000)),
      ]).catch(async (err) => {
        addLog(`URL render failed: ${err instanceof Error ? err.message : String(err)}`);
        console.warn('URL render failed, falling back to ObjectURL:', err);
        // Fallback: fetch as ArrayBuffer and render via Object URL (avoids CORS issues)
        const resp = await fetch(pptxSourceUrl, { credentials: 'include' as RequestCredentials });
        if (!resp.ok) throw new Error(`Fetch PPTX failed (${resp.status})`);
        const buf = await resp.arrayBuffer();
        const objUrl = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
        await Promise.race([
          (async () => { await tryRenderWithUrl(objUrl); rendered = true; })(),
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timed out loading PPTX via ObjectURL')), 20000)),
        ]).finally(() => URL.revokeObjectURL(objUrl));
      });
      const Reveal = (window as any).Reveal;
      const total = typeof Reveal?.getTotalSlides === 'function' ? Reveal.getTotalSlides() : (host.querySelectorAll('.reveal .slides section').length || 1);
      const html2canvas = (window as any).html2canvas as (node: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>;
      for (let i = 0; i < total; i++) {
        setRenderMsg(`Rendering slide ${i + 1}/${total}…`);
        if (Reveal && typeof Reveal.slide === 'function') Reveal.slide(i);
        await new Promise((r) => setTimeout(r, 150));
        const container = host.querySelector('.reveal') as HTMLElement | null;
        if (!container) throw new Error('Render container not found');
        const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/png'));
        await uploadPng(i + 1, blob, canvas.width, canvas.height);
      }
      host.remove();
      setRenderMsg('Done. Refreshing…');
      const res = await apiFetch<{ slides: Slide[] }>(`/api/slideshow/${sessionId}/slides`);
      setSlides(res.slides);
      setDetails(prev => prev ? { ...prev, totalSlides: res.slides.length } : prev);
    } catch (e) {
      console.error(e);
      const msg = (e as Error)?.message || 'Failed to render PPTX';
      setError(`${msg}`);
    } finally {
      // restore console and listeners
      console.error = console.error;
      console.warn = console.warn;
      // Remove listeners if they were added
      // Using bound variables to avoid TS issues
      try {
        // @ts-expect-error types ok at runtime
        if (errHandler) window.removeEventListener('error', errHandler);
        // @ts-expect-error types ok at runtime
        if (rejHandler) window.removeEventListener('unhandledrejection', rejHandler);
      } catch {}
      setRendering(false);
      setRenderMsg('');
    }
  }

  let content: ReactNode;
  if (loading) {
    content = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-600">Loading slideshow…</div>
      </div>
    );
  } else if (error || !details) {
    content = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-rose-700">{error || 'Not found'}</div>
      </div>
    );
  } else if (!slides.length) {
    content = (
      <div className="flex-1 grid place-items-center p-6">
        <Card className="p-6 max-w-xl w-full">
          <div className="text-lg font-semibold mb-2">Prepare slides for live sync</div>
          <div className="text-slate-600 mb-4">We will pre-render your {isPdf ? 'PDF' : isPpt ? 'PowerPoint' : 'file'} into per-slide PNGs on your device and upload them for students to view.</div>
          <div className="flex items-center gap-3">
            <Button disabled={rendering} onClick={() => { if (isPdf) void renderPdfToPngs(); else if (isPpt) void renderPptxToPngs(); else setError('Unsupported file'); }}>{rendering ? 'Rendering…' : 'Render now'}</Button>
            {renderMsg && (<div className="text-sm text-slate-500">{renderMsg}</div>)}
          </div>
          <div ref={renderHostRef} />
        </Card>
      </div>
    );
  } else {
    const total = slides.length;
    const current = Math.min(Math.max(1, details.currentSlide || 1), total);
    const slide = slides[current - 1];
    content = (
      <>
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" onClick={closeAndBack} disabled={working}>Back</Button>
          <div className="text-lg font-semibold truncate">{details.title}</div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={() => gotoSlide(current - 1)} disabled={working || current <= 1}>Prev</Button>
            <span className="text-sm text-slate-600">{current} / {total}</span>
            <Button variant="ghost" onClick={() => gotoSlide(current + 1)} disabled={working || current >= total}>Next</Button>
          </div>
        </div>
        <div className="flex-1 relative bg-black">
          <img src={slide.imageUrl} alt={`Slide ${slide.index}`} className="absolute inset-0 w-full h-full object-contain" />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {content}
    </div>
  );
}
