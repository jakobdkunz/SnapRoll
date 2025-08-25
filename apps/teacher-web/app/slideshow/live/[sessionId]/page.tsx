"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
import { apiFetch, getApiBaseUrl } from '@snaproll/api-client';

type SessionDetails = {
  id: string;
  title: string;
  filePath: string;
  mimeType: string;
  officeMode?: boolean;
  totalSlides: number | null;
  currentSlide: number;
  showOnDevices: boolean;
  allowDownload: boolean;
  requireStay: boolean;
  preventJump: boolean;
};

// Minimal PDF.js types to avoid 'any'
type PdfViewport = { width: number; height: number };
type PdfPage = {
  getViewport: (opts: { scale: number }) => PdfViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => { promise: Promise<unknown> };
};
type PdfDocument = { getPage: (n: number) => Promise<PdfPage> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (url: string | { url: string; withCredentials?: boolean; disableStream?: boolean; disableRange?: boolean }) => { promise: Promise<PdfDocument> };
};

export default function SlideshowLivePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const heartbeatRef = useRef<number | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pptContainerRef = useRef<HTMLDivElement | null>(null);
  const pptInitializedRef = useRef<boolean>(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const drawingRef = useRef<{ drawing: boolean; lastX: number; lastY: number }>({ drawing: false, lastX: 0, lastY: 0 });

  const fileUrl = useMemo(() => {
    if (!details) return '';
    let path = details.filePath;
    // Normalize accidentally missing colon in protocol (e.g., https//)
    if (/^https\/\//i.test(path)) path = path.replace(/^https\/\//i, 'https://');
    if (/^http\/\//i.test(path)) path = path.replace(/^http\/\//i, 'http://');
    return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path}`;
  }, [details]);

  // Determine type
  const isPdf = !!details && /pdf/i.test(details.mimeType);
  const isPpt = !!details && (/(powerpoint|\.pptx?$)/i.test(details.mimeType) || /\.pptx?$/i.test(details.filePath));
  const officeEmbedUrl = isPpt ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : '';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await apiFetch<SessionDetails>(`/api/slideshow/${sessionId}`);
      setDetails(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load slideshow');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Instructor heartbeat to keep the session active
    function tick() {
      void fetch(`${getApiBaseUrl()}/api/slideshow/${sessionId}/heartbeat`, { method: 'POST', headers: { 'Cache-Control': 'no-store' } });
    }
    tick();
    const id = window.setInterval(tick, 5000);
    heartbeatRef.current = id;
    return () => { if (heartbeatRef.current) window.clearInterval(heartbeatRef.current); };
  }, [sessionId]);

  async function closeAndBack() {
    try {
      setWorking(true);
      await apiFetch(`/api/slideshow/${sessionId}/close`, { method: 'POST' });
    } finally {
      setWorking(false);
      router.back();
    }
  }

  const gotoSlide = useCallback(async (next: number) => {
    if (!details) return;
    const min = 1;
    const max = details.totalSlides && details.totalSlides > 0 ? details.totalSlides : Number.POSITIVE_INFINITY;
    const clamped = Math.max(min, Math.min(max, next));
    if (clamped === details.currentSlide) return;
    try {
      setWorking(true);
      await apiFetch(`/api/slideshow/${details.id}/goto`, { method: 'POST', body: JSON.stringify({ currentSlide: clamped }) });
      setDetails((prev) => (prev ? { ...prev, currentSlide: clamped } : prev));
    } finally {
      setWorking(false);
    }
  }, [details]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!details) return;
      if (e.key === 'ArrowRight') gotoSlide(details.currentSlide + 1);
      if (e.key === 'ArrowLeft') gotoSlide(details.currentSlide - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [details, gotoSlide]);

  // Single pass render with hooks above
  let content: ReactNode;
  if (loading) {
    content = (<div className="min-h-dvh grid place-items-center p-6"><div className="text-slate-600">Loading slideshow…</div></div>);
  } else if (error || !details) {
    content = (<div className="min-h-dvh grid place-items-center p-6"><div className="text-rose-700">{error || 'Not found'}</div></div>);
  } else {
    content = (
      <>
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" onClick={closeAndBack} disabled={working}>Back</Button>
          <div className="text-lg font-semibold truncate">{details.title}</div>
          {isPdf ? (
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => gotoSlide(details.currentSlide - 1)} disabled={working || details.currentSlide <= 1}>Prev</Button>
              <div className="text-sm text-slate-600">Slide {Math.max(1, details.currentSlide)}{details.totalSlides ? ` / ${details.totalSlides}` : ''}</div>
              <Button onClick={() => gotoSlide(details.currentSlide + 1)} disabled={working}>Next</Button>
            </div>
          ) : isPpt ? (
            details.officeMode ? (
              <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                <Button variant="ghost" onClick={() => window.open(fileUrl, '_blank')}>Download</Button>
                <span>Use controls in the embedded viewer</span>
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" onClick={() => gotoSlide(details.currentSlide - 1)} disabled={working || details.currentSlide <= 1}>Prev</Button>
                <div className="text-sm text-slate-600">Slide {Math.max(1, details.currentSlide)}{details.totalSlides ? ` / ${details.totalSlides}` : ''}</div>
                <Button onClick={() => gotoSlide(details.currentSlide + 1)} disabled={working}>Next</Button>
              </div>
            )
          ) : null}
        </div>
        <div className="flex-1 min-h-0">
          {isPdf ? (
            <div ref={containerRef} className="relative w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] bg-black">
              <canvas ref={pageCanvasRef} className="absolute inset-0 m-auto max-w-full max-h-full" />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 cursor-crosshair"
                onPointerDown={(e) => {
                  if (!overlayCanvasRef.current) return;
                  overlayCanvasRef.current.setPointerCapture(e.pointerId);
                  const rect = overlayCanvasRef.current.getBoundingClientRect();
                  drawingRef.current.drawing = true;
                  drawingRef.current.lastX = e.clientX - rect.left;
                  drawingRef.current.lastY = e.clientY - rect.top;
                }}
                onPointerMove={(e) => {
                  if (!drawingRef.current.drawing || !overlayCanvasRef.current) return;
                  const ctx = overlayCanvasRef.current.getContext('2d');
                  if (!ctx) return;
                  const rect = overlayCanvasRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.lineWidth = tool === 'pen' ? 4 : 16;
                  ctx.strokeStyle = tool === 'pen' ? '#ffeb3b' : 'rgba(0,0,0,1)';
                  ctx.globalCompositeOperation = tool === 'pen' ? 'source-over' : 'destination-out';
                  ctx.beginPath();
                  ctx.moveTo(drawingRef.current.lastX, drawingRef.current.lastY);
                  ctx.lineTo(x, y);
                  ctx.stroke();
                  drawingRef.current.lastX = x;
                  drawingRef.current.lastY = y;
                }}
                onPointerUp={(e) => {
                  if (!overlayCanvasRef.current) return;
                  overlayCanvasRef.current.releasePointerCapture(e.pointerId);
                  drawingRef.current.drawing = false;
                }}
                onPointerCancel={() => { drawingRef.current.drawing = false; }}
              />
            </div>
          ) : isPpt && details.officeMode ? (
            <iframe title="slides" src={officeEmbedUrl} className="w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] border-0" />
          ) : isPpt ? (
            <div className="relative w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] bg-black">
              <div ref={pptContainerRef} className="absolute inset-0 overflow-hidden" />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 cursor-crosshair"
                onPointerDown={(e) => {
                  if (!overlayCanvasRef.current) return;
                  overlayCanvasRef.current.setPointerCapture(e.pointerId);
                  const rect = overlayCanvasRef.current.getBoundingClientRect();
                  drawingRef.current.drawing = true;
                  drawingRef.current.lastX = e.clientX - rect.left;
                  drawingRef.current.lastY = e.clientY - rect.top;
                }}
                onPointerMove={(e) => {
                  if (!drawingRef.current.drawing || !overlayCanvasRef.current) return;
                  const ctx = overlayCanvasRef.current.getContext('2d');
                  if (!ctx) return;
                  const rect = overlayCanvasRef.current.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.lineWidth = tool === 'pen' ? 4 : 16;
                  ctx.strokeStyle = tool === 'pen' ? '#ffeb3b' : 'rgba(0,0,0,1)';
                  ctx.globalCompositeOperation = tool === 'pen' ? 'source-over' : 'destination-out';
                  ctx.beginPath();
                  ctx.moveTo(drawingRef.current.lastX, drawingRef.current.lastY);
                  ctx.lineTo(x, y);
                  ctx.stroke();
                  drawingRef.current.lastX = x;
                  drawingRef.current.lastY = y;
                }}
                onPointerUp={(e) => {
                  if (!overlayCanvasRef.current) return;
                  overlayCanvasRef.current.releasePointerCapture(e.pointerId);
                  drawingRef.current.drawing = false;
                }}
                onPointerCancel={() => { drawingRef.current.drawing = false; }}
              />
            </div>
          ) : (
            <div className="h-full grid place-items-center p-6">
              <Card className="p-6 text-center max-w-lg">
                <div className="text-lg font-semibold mb-2">Preview not supported</div>
                <div className="text-slate-600 mb-4">This file type cannot be embedded. You can download and present locally.</div>
                <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white" href={fileUrl} target="_blank" rel="noreferrer">Download</a>
              </Card>
            </div>
          )}
        </div>
      </>
    );
  }

  // Render PDF page into canvas when details/page change
  useEffect(() => {
    if (!details || !pageCanvasRef.current || !containerRef.current) return;
    if (!isPdf) return;
    let cancelled = false;
    async function run() {
      // Lazy-load PDF.js legacy build for broad browser support
      const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf')).default as unknown as PdfJsLib;
      // Set worker (CDN, legacy path)
      (pdfjsLib as PdfJsLib).GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument({ url: fileUrl, withCredentials: false, disableStream: true, disableRange: true });
      const pdf: PdfDocument = await loadingTask.promise;
      if (cancelled) return;
      const pageNum = Math.max(1, (details?.currentSlide ?? 1));
      const page: PdfPage = await pdf.getPage(pageNum);
      if (cancelled) return;
      const container = containerRef.current!;
      const canvas = pageCanvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const viewport = page.getViewport({ scale: 1 });
      // Fit to container keeping aspect ratio
      const maxW = container.clientWidth;
      const maxH = container.clientHeight;
      const scale = Math.min(maxW / viewport.width, maxH / viewport.height);
      const scaled = page.getViewport({ scale });
      canvas.width = Math.floor(scaled.width);
      canvas.height = Math.floor(scaled.height);
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;
      // Center
      canvas.style.left = `${Math.max(0, (maxW - canvas.width) / 2)}px`;
      canvas.style.top = `${Math.max(0, (maxH - canvas.height) / 2)}px`;
      await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      // Match overlay to canvas size/position
      if (overlayCanvasRef.current) {
        const o = overlayCanvasRef.current;
        o.width = canvas.width;
        o.height = canvas.height;
        o.style.width = canvas.style.width;
        o.style.height = canvas.style.height;
        o.style.left = canvas.style.left;
        o.style.top = canvas.style.top;
      }
    }
    run();
    const ro = new ResizeObserver(() => run());
    ro.observe(containerRef.current);
    return () => { cancelled = true; ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPdf, details?.currentSlide, fileUrl]);

  // Render PPTX client-side with PPTXjs via CDN
  useEffect(() => {
    if (!details || !pptContainerRef.current) return;
    if (!isPpt) return;
    let cancelled = false;
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
    async function ensureDeps() {
      if (!(window as unknown as { jQuery?: unknown }).jQuery) await loadScript('https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js');
      if (!(window as unknown as { JSZip?: unknown }).JSZip) await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
      if (!(window as unknown as { Reveal?: unknown }).Reveal) await loadScript('https://cdn.jsdelivr.net/npm/reveal.js@4.6.1/dist/reveal.js');
      const w = window as unknown as { $?: { fn?: { pptxToHtml?: unknown } } };
      const hasPlugin = w?.$?.fn?.pptxToHtml;
      if (!hasPlugin) {
        await loadScript('https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@3.8.0/js/pptxjs.min.js');
        await loadScript('https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@3.8.0/js/divs2slides.min.js');
      }
    }
    async function render() {
      await ensureDeps();
      if (cancelled) return;
      const container = pptContainerRef.current!;
      container.innerHTML = '';
      const host = document.createElement('div');
      container.appendChild(host);
      type JQueryInstance = { pptxToHtml: (opts: Record<string, unknown>) => void };
      type JQueryFactory = (el: HTMLElement) => JQueryInstance;
      const wjq = window as unknown as { jQuery?: JQueryFactory };
      const jqFactory: JQueryFactory | undefined = wjq.jQuery;
      if (!jqFactory) return;
      jqFactory(host).pptxToHtml({
        pptxFileUrl: fileUrl,
        slideMode: true,
        slidesScale: '100%',
        keyBoardShortCut: false,
        mediaProcess: true,
        slideType: 'revealjs',
        revealjsConfig: { controls: false, progress: false }
      });
      setTimeout(() => {
        const wr = window as unknown as { Reveal?: { slide?: (n: number) => void } };
        wr.Reveal?.slide?.(Math.max(0, (((details && details.currentSlide) ? details.currentSlide : 1) - 1)));
      }, 400);
    }
    render();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPpt, fileUrl, details?.currentSlide]);

  return (<div className="min-h-dvh flex flex-col">{content}</div>);
}



