"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
import { apiFetch, getApiBaseUrl } from '@snaproll/api-client';
import * as XLSX from 'xlsx';

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

  // For PPTX rendering, use the direct Vercel Blob URL instead of proxy
  const directFileUrl = useMemo(() => {
    if (!rawFileUrl) return '';
    try {
      const u = new URL(rawFileUrl);
      const host = u.hostname.toLowerCase();
      // For PPTX, use direct Vercel Blob URL to avoid proxy issues
      if (host.endsWith('.vercel-storage.com') || host.endsWith('blob.vercel-storage.com')) {
        return rawFileUrl; // Use direct URL for PPTX
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

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!details) return;
    const heartbeat = async () => {
      try {
        await apiFetch(`/api/slideshow/${sessionId}/heartbeat`, { method: 'POST' });
      } catch (e) {
        console.error('Heartbeat failed:', e);
      }
    };
    heartbeatRef.current = window.setInterval(heartbeat, 30000);
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [details, sessionId]);

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

  // PPTX rendering using SheetJS
  useEffect(() => {
    if (!isPpt || !directFileUrl || !pptContainerRef.current) return;
    
    let cancelled = false;
    
    async function renderPptx() {
      setDebug((prev) => prev + `\nPPTX: Starting SheetJS-based rendering`);
      setDebug((prev) => prev + `\nPPTX: Fetching from: ${directFileUrl}`);
      
      try {
        // Fetch the PPTX file
        const response = await fetch(directFileUrl);
        if (!response.ok) {
          setDebug((prev) => prev + `\nPPTX: Fetch failed: ${response.status} ${response.statusText}`);
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        setDebug((prev) => prev + `\nPPTX: Fetched ${arrayBuffer.byteLength} bytes`);
        
        // Read the PPTX file using SheetJS
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        setDebug((prev) => prev + `\nPPTX: Workbook loaded, sheets: ${workbook.SheetNames.join(', ')}`);
        
        // Extract slides from the workbook
        const slides: string[] = [];
        
        // Look for slide-related sheets
        const slideSheets = workbook.SheetNames.filter(name => 
          name.toLowerCase().includes('slide') || 
          name.toLowerCase().includes('sheet') ||
          /^slide\d+$/i.test(name)
        );
        
        setDebug((prev) => prev + `\nPPTX: Found slide sheets: ${slideSheets.join(', ')}`);
        
        if (slideSheets.length === 0) {
          // Try to process all sheets as potential slides
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const html = XLSX.utils.sheet_to_html(worksheet);
            if (html && html.trim()) {
              slides.push(html);
              setDebug((prev) => prev + `\nPPTX: Processed sheet "${sheetName}" as slide`);
            }
          }
        } else {
          // Process identified slide sheets
          for (const sheetName of slideSheets) {
            const worksheet = workbook.Sheets[sheetName];
            const html = XLSX.utils.sheet_to_html(worksheet);
            if (html && html.trim()) {
              slides.push(html);
              setDebug((prev) => prev + `\nPPTX: Processed slide sheet "${sheetName}"`);
            }
          }
        }
        
        setDebug((prev) => prev + `\nPPTX: Generated ${slides.length} slides`);
        
        if (slides.length === 0) {
          setDebug((prev) => prev + `\nPPTX: No slides found, trying alternative approach`);
          
          // Try to extract text content from all sheets
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (jsonData && jsonData.length > 0) {
              const slideContent = jsonData
                .filter((row: any) => row && row.length > 0)
                .map((row: any) => `<div>${row.join(' ')}</div>`)
                .join('');
              
              if (slideContent.trim()) {
                slides.push(`<div class="slide">${slideContent}</div>`);
                setDebug((prev) => prev + `\nPPTX: Created slide from sheet "${sheetName}"`);
              }
            }
          }
        }
        
        if (cancelled) return;
        
        // Render the slides
        const container = pptContainerRef.current!;
        container.innerHTML = '';
        
        if (slides.length === 0) {
          setDebug((prev) => prev + `\nPPTX: No content could be extracted from PPTX file`);
          container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No slides found in presentation</div>';
          return;
        }
        
        // Create slideshow container
        const slideshowContainer = document.createElement('div');
        slideshowContainer.className = 'slideshow-container w-full h-full';
        slideshowContainer.style.cssText = `
          position: relative;
          overflow: hidden;
          background: white;
        `;
        
        // Add slides
        slides.forEach((slideHtml, index) => {
          const slideElement = document.createElement('div');
          slideElement.className = `slide ${index === 0 ? 'active' : 'hidden'}`;
          slideElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 40px;
            box-sizing: border-box;
            overflow: auto;
            background: white;
            ${index === 0 ? 'opacity: 1;' : 'opacity: 0;'}
            transition: opacity 0.3s ease;
          `;
          slideElement.innerHTML = slideHtml;
          slideshowContainer.appendChild(slideElement);
        });
        
        container.appendChild(slideshowContainer);
        
        // Add navigation controls
        if (slides.length > 1) {
          const navContainer = document.createElement('div');
          navContainer.className = 'slide-nav absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2';
          navContainer.style.cssText = `
            position: absolute;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            z-index: 10;
          `;
          
          const prevBtn = document.createElement('button');
          prevBtn.textContent = '←';
          prevBtn.className = 'px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700';
          prevBtn.onclick = () => navigateSlide(-1);
          
          const nextBtn = document.createElement('button');
          nextBtn.textContent = '→';
          nextBtn.className = 'px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700';
          nextBtn.onclick = () => navigateSlide(1);
          
          const slideIndicator = document.createElement('span');
          slideIndicator.className = 'px-3 py-1 bg-gray-800 text-white rounded';
          slideIndicator.textContent = `1 / ${slides.length}`;
          
          navContainer.appendChild(prevBtn);
          navContainer.appendChild(slideIndicator);
          navContainer.appendChild(nextBtn);
          container.appendChild(navContainer);
          
          let currentSlideIndex = 0;
          
          function navigateSlide(direction: number) {
            const newIndex = Math.max(0, Math.min(slides.length - 1, currentSlideIndex + direction));
            if (newIndex !== currentSlideIndex) {
              const slides = slideshowContainer.querySelectorAll('.slide');
              slides[currentSlideIndex].classList.remove('active');
              slides[currentSlideIndex].classList.add('hidden');
              slides[currentSlideIndex].style.opacity = '0';
              
              slides[newIndex].classList.remove('hidden');
              slides[newIndex].classList.add('active');
              slides[newIndex].style.opacity = '1';
              
              currentSlideIndex = newIndex;
              slideIndicator.textContent = `${currentSlideIndex + 1} / ${slides.length}`;
              
              // Update slide number in parent component
              if (details) {
                setDetails(prev => prev ? { ...prev, currentSlide: currentSlideIndex + 1 } : null);
              }
            }
          }
          
          // Keyboard navigation
          const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
              navigateSlide(-1);
            } else if (e.key === 'ArrowRight') {
              navigateSlide(1);
            }
          };
          
          document.addEventListener('keydown', handleKeyPress);
          
          // Cleanup
          return () => {
            document.removeEventListener('keydown', handleKeyPress);
          };
        }
        
        setDebug((prev) => prev + `\nPPTX: Successfully rendered ${slides.length} slides using SheetJS`);
        
      } catch (err) {
        setDebug((prev) => prev + `\nPPTX: SheetJS rendering error: ${(err as Error)?.message || String(err)}`);
        const container = pptContainerRef.current!;
        container.innerHTML = '<div class="flex items-center justify-center h-full text-red-500">Failed to load presentation</div>';
      }
    }
    
    renderPptx();
    
    return () => {
      cancelled = true;
    };
  }, [isPpt, directFileUrl, details]);

  async function closeAndBack() {
    if (working) return;
    setWorking(true);
    try {
      await apiFetch(`/api/slideshow/${sessionId}/close`, { method: 'POST' });
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to close slideshow:', e);
      router.push('/dashboard');
    } finally {
      setWorking(false);
    }
  }

  // PDF rendering
  useEffect(() => {
    if (!isPdf || !fileUrl || !pageCanvasRef.current || !overlayCanvasRef.current || !containerRef.current) return;
    
    let cancelled = false;
    async function renderPdf() {
      try {
        setDebug((prev) => prev + `\nPDF: Starting render`);
        const pdfjsLib = (window as any).pdfjsLib as PdfJsLib;
        if (!pdfjsLib) {
          setDebug((prev) => prev + `\nPDF: pdfjsLib not available`);
          return;
        }
        
        pdfjsLib.GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions || {};
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        
        pdfDocRef.current = pdf;
        pdfUrlRef.current = fileUrl;
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        
        const canvas = pageCanvasRef.current!;
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        if (cancelled) return;
        
        setPdfReadyTick(prev => prev + 1);
        setDebug((prev) => prev + `\nPDF: Render complete`);
      } catch (err) {
        setDebug((prev) => prev + `\nPDF: Render error: ${(err as Error)?.message || String(err)}`);
      }
    }
    
    renderPdf();
    
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isPdf, fileUrl, pdfReadyTick]);

  // Drawing functionality
  useEffect(() => {
    if (!overlayCanvasRef.current || !pageCanvasRef.current) return;
    
    const overlayCanvas = overlayCanvasRef.current;
    const pageCanvas = pageCanvasRef.current;
    const ctx = overlayCanvas.getContext('2d')!;
    
    // Match overlay canvas size to page canvas
    overlayCanvas.width = pageCanvas.width;
    overlayCanvas.height = pageCanvas.height;
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    function getMousePos(e: MouseEvent) {
      const rect = overlayCanvas.getBoundingClientRect();
      const scaleX = overlayCanvas.width / rect.width;
      const scaleY = overlayCanvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
    
    function startDrawing(e: MouseEvent) {
      isDrawing = true;
      const pos = getMousePos(e);
      lastX = pos.x;
      lastY = pos.y;
    }
    
    function draw(e: MouseEvent) {
      if (!isDrawing) return;
      
      const pos = getMousePos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = tool === 'pen' ? '#000' : '#fff';
      ctx.lineWidth = tool === 'pen' ? 2 : 10;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      lastX = pos.x;
      lastY = pos.y;
    }
    
    function stopDrawing() {
      isDrawing = false;
    }
    
    overlayCanvas.addEventListener('mousedown', startDrawing);
    overlayCanvas.addEventListener('mousemove', draw);
    overlayCanvas.addEventListener('mouseup', stopDrawing);
    overlayCanvas.addEventListener('mouseout', stopDrawing);
    
    return () => {
      overlayCanvas.removeEventListener('mousedown', startDrawing);
      overlayCanvas.removeEventListener('mousemove', draw);
      overlayCanvas.removeEventListener('mouseup', stopDrawing);
      overlayCanvas.removeEventListener('mouseout', stopDrawing);
    };
  }, [tool, pdfReadyTick]);

  let content: ReactNode;
  if (loading) {
    content = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading slideshow...</p>
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={load}>Retry</Button>
        </div>
      </div>
    );
  } else if (!details) {
    content = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No slideshow details available</p>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-black">SnapRoll</span>
              <span className="text-sm font-medium text-green-600">Instructor</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {details.currentSlide} / {details.totalSlides || '?'}
              </span>
              <Button onClick={closeAndBack} disabled={working}>
                {working ? 'Closing...' : 'Close'}
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 relative">
          {isPdf && (
            <div ref={containerRef} className="relative w-full h-full">
              <canvas
                ref={pageCanvasRef}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-auto"
                style={{ touchAction: 'none' }}
              />
            </div>
          )}
          
          {isPpt && (
            <div ref={pptContainerRef} className="w-full h-full" />
          )}
          
          {!isPdf && !isPpt && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600">Unsupported file type</p>
            </div>
          )}
        </main>
        
        {debug && (
          <div className="fixed bottom-4 right-4 max-w-md max-h-64 overflow-auto bg-black text-green-400 text-xs p-4 rounded border">
            <pre>{debug}</pre>
          </div>
        )}
      </>
    );
  }

  return (<div className="min-h-dvh flex flex-col">{content}</div>);
}



