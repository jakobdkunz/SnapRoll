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
  GlobalWorkerOptions?: { workerSrc: string };
  getDocument: (
    url: string | { url: string; withCredentials?: boolean; disableStream?: boolean; disableRange?: boolean }
  ) => { promise: Promise<PdfDocument> };
};

export default function SlideshowLivePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [debug, setDebug] = useState<string>('');
  const heartbeatRef = useRef<number | null>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);
  const pdfUrlRef = useRef<string>('');
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [pdfReadyTick, setPdfReadyTick] = useState(0);
  const bitmapCacheRef = useRef<Map<string, ImageBitmap>>(new Map());
  const pptContainerRef = useRef<HTMLDivElement | null>(null);
  const [tool] = useState<'pen' | 'eraser'>('pen');
  const drawingRef = useRef<{ drawing: boolean; lastX: number; lastY: number }>({ drawing: false, lastX: 0, lastY: 0 });

  const rawFileUrl = useMemo(() => {
    if (!details) return '';
    let path = details.filePath;
    // Normalize accidentally missing colon in protocol (e.g., https//)
    if (/^https\/\//i.test(path)) path = path.replace(/^https\/\//i, 'https://');
    if (/^http\/\//i.test(path)) path = path.replace(/^http\/\//i, 'http://');
    return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path}`;
  }, [details]);
  const fileUrl = useMemo(() => {
    if (!rawFileUrl) return '';
    try {
      const u = new URL(rawFileUrl);
      const host = u.hostname.toLowerCase();
      // Proxy blob hosts to avoid CORS/Range issues in PDF.js and PPTXjs
      if (host.endsWith('.vercel-storage.com') || host.endsWith('blob.vercel-storage.com')) {
        const api = getApiBaseUrl().replace(/\/$/, '');
        const proxied = `${api}/api/proxy?url=${encodeURIComponent(rawFileUrl)}`;
        return proxied;
      }
      return rawFileUrl;
    } catch {
      return rawFileUrl;
    }
  }, [rawFileUrl]);

  // Determine type
  const isPdf = !!details && /pdf/i.test(details.mimeType);
  const isPpt = !!details && (/(powerpoint|\.pptx?$)/i.test(details.mimeType) || /\.pptx?$/i.test(details.filePath));
  const officeEmbedUrl = isPpt ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : '';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await apiFetch<SessionDetails>(`/api/slideshow/${sessionId}`);
      setDetails(d);
      setDebug(`Loaded session: ${d.id}\nmime=${d.mimeType} pdf=${/pdf/i.test(d.mimeType)} ppt=${/(powerpoint|\\.pptx?$)/i.test(d.mimeType) || /\\.pptx?$/i.test(d.filePath)} officeMode=${String(d.officeMode)}\nurl=${d.filePath}`);
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
      await apiFetch(`/api/slideshow/${details.id}/goto`, { method: 'POST', body: JSON.stringify({ slide: clamped }) });
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
            <div ref={containerRef} className="relative w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] bg-white">
              {debug && (
                <div className="absolute top-2 left-2 z-50 max-w-[60vw] bg-black/70 text-green-300 text-xs p-2 rounded whitespace-pre-wrap">{debug}</div>
              )}
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
              {debug && (
                <div className="absolute top-2 left-2 z-50 max-w-[60vw] bg-black/70 text-green-300 text-xs p-2 rounded whitespace-pre-wrap">{debug || `PPTX url=${fileUrl}`}</div>
              )}
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

  // Load PDF doc once per URL
  useEffect(() => {
    if (!details || !isPdf) return;
    (async () => {
      try {
        // Import PDF.js using CDN to avoid canvas module issues
        const pdfjsLib = (window as any).pdfjsLib as PdfJsLib;
        if (!pdfjsLib) {
          throw new Error('PDF.js not loaded from CDN');
        }
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }
        if (pdfUrlRef.current !== fileUrl) {
          setDebug((prev) => prev + `\nPDF doc load: ${fileUrl}`);
          const task = pdfjsLib.getDocument({ url: fileUrl, withCredentials: false, disableStream: true, disableRange: true });
          pdfDocRef.current = await task.promise;
          pdfUrlRef.current = fileUrl;
          setPdfReadyTick((t) => t + 1);
        }
      } catch (err) {
        setError('Failed to load PDF');
        setDebug((prev) => prev + `\nPDF load error: ${(err as Error)?.message || String(err)}`);
      }
    })();
  }, [isPdf, fileUrl, details]);

  // Render current page; debounce resize and cancel previous render
  useEffect(() => {
    if (!details || !isPdf || !pageCanvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    let t = 0;
    const schedule = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(async () => {
        const pdf = pdfDocRef.current;
        if (!pdf) return;
        try {
          const page = await pdf.getPage(Math.max(1, details.currentSlide || 1));
          const canvas = pageCanvasRef.current!;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          const viewport = page.getViewport({ scale: 1 });
          const maxW = container.clientWidth;
          const maxH = container.clientHeight;
          const scale = Math.min(maxW / viewport.width, maxH / viewport.height);
          const scaled = page.getViewport({ scale });
          canvas.width = Math.floor(scaled.width);
          canvas.height = Math.floor(scaled.height);
          canvas.style.width = `${canvas.width}px`;
          canvas.style.height = `${canvas.height}px`;
          canvas.style.left = `${Math.max(0, (maxW - canvas.width) / 2)}px`;
          canvas.style.top = `${Math.max(0, (maxH - canvas.height) / 2)}px`;
          if (renderTaskRef.current && renderTaskRef.current.cancel) {
            try {
              renderTaskRef.current.cancel();
            } catch (e) {
              setDebug((prev) => prev + `\nPDF: cancel previous render failed: ${(e as Error)?.message || String(e)}`);
            }
          }
          const task = page.render({ canvasContext: ctx, viewport: scaled });
          renderTaskRef.current = task as { cancel: () => void; promise: Promise<unknown> };
          await (task as { promise: Promise<unknown> }).promise;
          if (overlayCanvasRef.current) {
            const o = overlayCanvasRef.current;
            o.width = canvas.width;
            o.height = canvas.height;
            o.style.width = canvas.style.width;
            o.style.height = canvas.style.height;
            o.style.left = canvas.style.left;
            o.style.top = canvas.style.top;
          }
        } catch (err) {
          setError('Failed to get PDF page');
          setDebug((prev) => prev + `\nPDF page/render error: ${(err as Error)?.message || String(err)}`);
        }
      }, 0);
    };
    schedule();
    const ro = new ResizeObserver(() => schedule());
    ro.observe(container);
    return () => { if (t) window.clearTimeout(t); ro.disconnect(); };
  }, [isPdf, details, pdfReadyTick]);

  // Render PPTX client-side with PPTXjs via CDN
  useEffect(() => {
    if (!details || !pptContainerRef.current) return;
    if (!isPpt) return;
    let cancelled = false;
    async function loadScriptWithFallback(localPath: string, cdnUrl: string) {
      const tryLoad = (src: string) => new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(s);
      });
      try {
        await tryLoad(localPath);
      } catch (e) {
        setDebug((prev) => prev + `\nPPTX: local load failed, falling back → ${cdnUrl}`);
        await tryLoad(cdnUrl);
      }
    }
    function ensureCssWithFallback(localPath: string, cdnUrl: string) {
      const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      if (existing.some((l) => l.href.endsWith(localPath) || l.href.includes(cdnUrl))) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = localPath;
      link.onerror = () => {
        link.href = cdnUrl;
      };
      document.head.appendChild(link);
    }
    async function ensureDeps() {
      // CSS first (local, then fallback)
      ensureCssWithFallback('/vendor/reveal.css', 'https://cdn.jsdelivr.net/npm/reveal.js@4.6.1/dist/reveal.css');
      ensureCssWithFallback('/vendor/pptxjs.css', 'https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/pptxjs.css');
      // Scripts (local, then fallback via proxy)
      if (!(window as unknown as { jQuery?: unknown }).jQuery) await loadScriptWithFallback('/vendor/jquery.min.js', 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js');
      if (!(window as unknown as { JSZip?: unknown }).JSZip) await loadScriptWithFallback('/vendor/jszip.min.js', 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
      if (!(window as unknown as { Reveal?: unknown }).Reveal) await loadScriptWithFallback('/vendor/reveal.js', 'https://cdn.jsdelivr.net/npm/reveal.js@4.6.1/dist/reveal.js');
      // Create FileReaderJS polyfill for PPTXjs compatibility
      if (!(window as unknown as { FileReaderJS?: unknown }).FileReaderJS) {
        (window as any).FileReaderJS = {
          // Complete polyfill that provides all methods PPTXjs expects
          readAsDataURL: function(file: File, callback: (result: string) => void) {
            const reader = new FileReader();
            reader.onload = function(e) {
              callback(e.target?.result as string);
            };
            reader.readAsDataURL(file);
          },
          setSync: function() {
            // PPTXjs calls this but doesn't seem to need it for our use case
            return true;
          },
          setupBlob: function() {
            // PPTXjs calls this to setup blob handling, but we don't need special setup
            return true;
          },
          readAsText: function(file: File, callback: (result: string) => void) {
            const reader = new FileReader();
            reader.onload = function(e) {
              callback(e.target?.result as string);
            };
            reader.readAsText(file);
          },
          readAsArrayBuffer: function(file: File, callback: (result: ArrayBuffer) => void) {
            const reader = new FileReader();
            reader.onload = function(e) {
              callback(e.target?.result as ArrayBuffer);
            };
            reader.readAsArrayBuffer(file);
          }
        };
      }
      const w = window as unknown as { $?: { fn?: { pptxToHtml?: unknown } } };
      const hasPlugin = w?.$?.fn?.pptxToHtml;
      setDebug((prev) => prev + `\nPPTX: jQuery available: ${!!w?.$}, pptxToHtml plugin available: ${!!hasPlugin}`);
      
      if (!hasPlugin) {
        setDebug((prev) => prev + `\nPPTX: Loading pptxjs.min.js...`);
        await loadScriptWithFallback('/vendor/pptxjs.min.js', 'https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/pptxjs.min.js');
        setDebug((prev) => prev + `\nPPTX: Loading divs2slides.min.js...`);
        await loadScriptWithFallback('/vendor/divs2slides.min.js', 'https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/divs2slides.min.js');
        
        // Check again after loading
        const w2 = window as unknown as { $?: { fn?: { pptxToHtml?: unknown } } };
        const hasPlugin2 = w2?.$?.fn?.pptxToHtml;
        setDebug((prev) => prev + `\nPPTX: After loading - jQuery available: ${!!w2?.$}, pptxToHtml plugin available: ${!!hasPlugin2}`);
      }
    }
    async function render() {
      await ensureDeps();
      if (cancelled) return;
      
      // Add a small delay to ensure scripts are fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
              // Test if we can actually fetch the PPTX file
        let pptxBlob: Blob | null = null;
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            setDebug((prev) => prev + `\nPPTX: File fetch failed: ${response.status} ${response.statusText}`);
            return;
          }
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          setDebug((prev) => prev + `\nPPTX: File fetch success, content-type: ${contentType}, content-length: ${contentLength}`);
          
          // Try to read a small portion to verify it's actually a PPTX file
          const arrayBuffer = await response.arrayBuffer();
          setDebug((prev) => prev + `\nPPTX: File size: ${arrayBuffer.byteLength} bytes`);
          
          // Check if it starts with PPTX magic bytes (PK\x03\x04)
          const uint8Array = new Uint8Array(arrayBuffer);
          const isPptx = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B && uint8Array[2] === 0x03 && uint8Array[3] === 0x04;
          setDebug((prev) => prev + `\nPPTX: File appears to be PPTX: ${isPptx}`);
          
          // Create a blob from the array buffer for PPTXjs
          pptxBlob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
          setDebug((prev) => prev + `\nPPTX: Created blob: ${pptxBlob.size} bytes, type: ${pptxBlob.type}`);
          
        } catch (err) {
          setDebug((prev) => prev + `\nPPTX: File fetch error: ${(err as Error)?.message || String(err)}`);
          return;
        }
      
      const container = pptContainerRef.current!;
      container.innerHTML = '';
      const host = document.createElement('div');
      container.appendChild(host);
      type JQueryInstance = { pptxToHtml: (opts: Record<string, unknown>) => void };
      type JQueryFactory = (el: HTMLElement) => JQueryInstance;
      const wjq = window as unknown as { jQuery?: JQueryFactory };
      const jqFactory: JQueryFactory | undefined = wjq.jQuery;
      if (!jqFactory) {
        setDebug((prev) => prev + `\nPPTX: jQuery missing`);
        return;
      }
      try {
        setDebug((prev) => prev + `\nPPTX: Starting render with url=${fileUrl}`);
        
        // Capture console errors during PPTX rendering
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        const errors: string[] = [];
        const warnings: string[] = [];
        
        console.error = (...args) => {
          errors.push(args.map(arg => String(arg)).join(' '));
          originalConsoleError.apply(console, args);
        };
        
        console.warn = (...args) => {
          warnings.push(args.map(arg => String(arg)).join(' '));
          originalConsoleWarn.apply(console, args);
        };
        
        // Try a different approach - use pptxFile with blob instead of URL
        const pptxOptions = {
          pptxFile: pptxBlob, // Use the blob directly
          slideMode: true,
          slidesScale: '100%',
          keyBoardShortCut: false,
          mediaProcess: true,
          slideType: 'revealjs',
          revealjsConfig: { controls: false, progress: false },
          success: function() {
            setDebug((prev) => prev + `\nPPTX: Render success!`);
            // Restore console
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
          },
          error: function(err: any) {
            setDebug((prev) => prev + `\nPPTX: Render error callback: ${err?.message || String(err)}`);
            // Restore console
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
          }
        };
        
        setDebug((prev) => prev + `\nPPTX: Calling pptxToHtml with options: ${JSON.stringify(pptxOptions, null, 2)}`);
        
        // Test if PPTXjs is actually working
        const jq = jqFactory(host);
        setDebug((prev) => prev + `\nPPTX: jQuery object: ${!!jq}`);
        setDebug((prev) => prev + `\nPPTX: pptxToHtml method: ${typeof jq.pptxToHtml}`);
        
        // Check if PPTXjs has any internal state or methods we can inspect
        setDebug((prev) => prev + `\nPPTX: jQuery object keys: ${Object.keys(jq).join(', ')}`);
        if (jq.pptxToHtml) {
          setDebug((prev) => prev + `\nPPTX: pptxToHtml function keys: ${Object.keys(jq.pptxToHtml).join(', ')}`);
        }
        
        // Check if PPTXjs is actually loaded globally
        setDebug((prev) => prev + `\nPPTX: Global jQuery: ${typeof (window as any).jQuery}`);
        setDebug((prev) => prev + `\nPPTX: Global pptxToHtml: ${typeof (window as any).jQuery?.fn?.pptxToHtml}`);
        setDebug((prev) => prev + `\nPPTX: Global pptxjs: ${typeof (window as any).pptxjs}`);
        
        // Try to get the plugin from the global jQuery object
        const globalJq = (window as any).jQuery;
        if (globalJq && globalJq.fn && globalJq.fn.pptxToHtml) {
          setDebug((prev) => prev + `\nPPTX: Found global pptxToHtml plugin!`);
          const globalJqHost = globalJq(host);
          setDebug((prev) => prev + `\nPPTX: Global jQuery object keys: ${Object.keys(globalJqHost).join(', ')}`);
        } else {
          setDebug((prev) => prev + `\nPPTX: Global pptxToHtml plugin not found`);
        }
        
        try {
          jq.pptxToHtml(pptxOptions);
          setDebug((prev) => prev + `\nPPTX: pptxToHtml call completed without exception`);
        } catch (err) {
          setDebug((prev) => prev + `\nPPTX: Exception during pptxToHtml call: ${(err as Error)?.message || String(err)}`);
        }
        
        setDebug((prev) => prev + `\nPPTX: pptxToHtml called successfully`);
        
        // Check if content was actually rendered after a delay
        setTimeout(() => {
          if (host.children.length === 0) {
            setDebug((prev) => prev + `\nPPTX: No content rendered after timeout`);
            setDebug((prev) => prev + `\nPPTX: Host element HTML: ${host.innerHTML}`);
            setDebug((prev) => prev + `\nPPTX: Console errors: ${errors.join(' | ')}`);
            setDebug((prev) => prev + `\nPPTX: Console warnings: ${warnings.join(' | ')}`);
            
            // Try to check if PPTXjs is actually working by testing with a simple call
            try {
              const jq = jqFactory(host);
              setDebug((prev) => prev + `\nPPTX: jQuery object created: ${!!jq}`);
              setDebug((prev) => prev + `\nPPTX: pptxToHtml method exists: ${typeof jq.pptxToHtml === 'function'}`);
            } catch (err) {
              setDebug((prev) => prev + `\nPPTX: jQuery test error: ${(err as Error)?.message || String(err)}`);
            }
          } else {
            setDebug((prev) => prev + `\nPPTX: Content found, children count: ${host.children.length}`);
            setDebug((prev) => prev + `\nPPTX: First child tag: ${host.children[0]?.tagName}`);
          }
          
          // Restore console
          console.error = originalConsoleError;
          console.warn = originalConsoleWarn;
          
          const wr = window as unknown as { Reveal?: { slide?: (n: number) => void } };
          wr.Reveal?.slide?.(Math.max(0, (((details && details.currentSlide) ? details.currentSlide : 1) - 1)));
        }, 3000); // Increased timeout to give more time for rendering
      } catch (err) {
        setDebug((prev) => prev + `\nPPTX render error: ${(err as Error)?.message || String(err)}`);
      }
    }
    render();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPpt, fileUrl, details?.currentSlide]);

  return (<div className="min-h-dvh flex flex-col">{content}</div>);
}



