"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
import { apiFetch, getApiBaseUrl } from '@snaproll/api-client';
import JSZip from 'jszip';

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
  render: (context: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => { promise: Promise<void>; cancel: () => void };
};
type PdfJsLib = {
  getDocument: (data: ArrayBuffer) => Promise<{ numPages: number; getPage: (pageNum: number) => Promise<PdfPage> }>;
};

export default function SlideshowPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [working, setWorking] = useState(false);
  const [debug, setDebug] = useState('');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [pdfReadyTick, setPdfReadyTick] = useState(0);
  const [pptxSlides, setPptxSlides] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // Load session details
  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        setDebug('Loading session...');
        const data = await apiFetch<SessionDetails>(`/api/slideshow/${sessionId}`);
        if (cancelled) return;
        
        setDetails(data);
        setDebug(`Loaded session: ${data.id}\nmime=${data.mimeType} pdf=${data.mimeType === 'application/pdf'} ppt=${data.mimeType.includes('powerpoint') || data.mimeType.includes('presentation')} officeMode=${data.officeMode || false} url=${data.filePath}`);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Session not found');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    loadSession();
    return () => { cancelled = true; };
  }, [sessionId]);

  const rawFileUrl = details?.filePath;
  const isPdf = details?.mimeType === 'application/pdf';
  const isPpt = details?.mimeType.includes('powerpoint') || details?.mimeType.includes('presentation');

  const fileUrl = useMemo(() => {
    if (!rawFileUrl) return '';
    try {
      const u = new URL(rawFileUrl);
      const host = u.hostname.toLowerCase();
      // Proxy blob hosts to avoid CORS/Range issues in PDF.js
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

  const directFileUrl = useMemo(() => {
    if (!rawFileUrl) return '';
    return rawFileUrl; // Direct URL for PPTX
  }, [rawFileUrl]);

  // PPTX rendering using JSZip
  useEffect(() => {
    if (!isPpt || !directFileUrl) return;
    
    let cancelled = false;
    async function renderPptx() {
      try {
        setDebug((prev) => prev + `\nPPTX: Starting JSZip-based rendering`);
        setDebug((prev) => prev + `\nPPTX: Fetching from: ${directFileUrl}`);
        
        const response = await fetch(directFileUrl);
        if (cancelled) return;
        
        if (!response.ok) {
          setDebug((prev) => prev + `\nPPTX: Fetch failed: ${response.status} ${response.statusText}`);
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        setDebug((prev) => prev + `\nPPTX: Fetched ${arrayBuffer.byteLength} bytes`);
        
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(arrayBuffer);
        
        // Extract slide XML files
        const slideFiles: string[] = [];
        for (const [filename, file] of Object.entries(zipContent.files)) {
          if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
            const content = await file.async('string');
            slideFiles.push(content);
          }
        }
        
        if (cancelled) return;
        
        setDebug((prev) => prev + `\nPPTX: Found ${slideFiles.length} slides`);
        
        // Parse slides and convert to HTML
        const htmlSlides = slideFiles.map((slideXml, index) => {
          try {
            // Simple XML parsing to extract text content
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(slideXml, 'text/xml');
            
            // Extract text from all text elements
            const textElements = xmlDoc.querySelectorAll('a:t, t');
            const texts: string[] = [];
            textElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text) texts.push(text);
            });
            
            // Create a simple HTML slide
            const slideHtml = `
              <div class="slide" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: white; padding: 40px; box-sizing: border-box;">
                <h1 style="font-size: 2.5rem; margin-bottom: 1rem; text-align: center;">Slide ${index + 1}</h1>
                <div style="font-size: 1.2rem; text-align: center; line-height: 1.6;">
                  ${texts.map(text => `<p style="margin: 0.5rem 0;">${text}</p>`).join('')}
                </div>
              </div>
            `;
            
            return slideHtml;
          } catch (err) {
            setDebug((prev) => prev + `\nPPTX: Error parsing slide ${index + 1}: ${(err as Error).message}`);
            return `
              <div class="slide" style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background: white;">
                <h1>Slide ${index + 1}</h1>
              </div>
            `;
          }
        });
        
        if (cancelled) return;
        
        setPptxSlides(htmlSlides);
        setDebug((prev) => prev + `\nPPTX: Successfully parsed ${htmlSlides.length} slides`);
        
      } catch (err) {
        setDebug((prev) => prev + `\nPPTX: JSZip rendering error: ${(err as Error)?.message || String(err)}`);
      }
    }
    
    renderPptx();
    return () => { cancelled = true; };
  }, [isPpt, directFileUrl]);

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

        const response = await fetch(fileUrl);
        if (cancelled) return;
        
        if (!response.ok) {
          setDebug((prev) => prev + `\nPDF: Fetch failed: ${response.status}`);
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        if (cancelled) return;

        const page = await pdf.getPage(details?.currentSlide || 1);
        if (cancelled) return;

        const canvas = pageCanvasRef.current!;
        const context = canvas.getContext('2d')!;
        
        const viewport = page.getViewport({ scale: 1.5 });
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
        <div className="text-slate-600">Loading slideshow…</div>
      </div>
    );
  } else if (error || !details) {
    content = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-rose-700">{error || 'Not found'}</div>
      </div>
    );
  } else {
    content = (
      <>
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" onClick={closeAndBack} disabled={working}>Back</Button>
          <div className="text-lg font-semibold truncate">{details.title}</div>
          {isPdf ? (
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => gotoSlide(details.currentSlide - 1)} disabled={working || details.currentSlide <= 1}>Prev</Button>
              <span className="text-sm text-slate-600">{details.currentSlide} / {details.totalSlides || '?'}</span>
              <Button variant="ghost" onClick={() => gotoSlide(details.currentSlide + 1)} disabled={working || (details.totalSlides && details.currentSlide >= details.totalSlides)}>Next</Button>
            </div>
          ) : isPpt && pptxSlides.length > 0 ? (
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} disabled={currentSlideIndex <= 0}>Prev</Button>
              <span className="text-sm text-slate-600">{currentSlideIndex + 1} / {pptxSlides.length}</span>
              <Button variant="ghost" onClick={() => setCurrentSlideIndex(Math.min(pptxSlides.length - 1, currentSlideIndex + 1))} disabled={currentSlideIndex >= pptxSlides.length - 1}>Next</Button>
            </div>
          ) : null}
        </div>
        
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          {isPdf ? (
            <>
              <canvas ref={pageCanvasRef} className="absolute inset-0 w-full h-full" />
              <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />
            </>
          ) : isPpt && pptxSlides.length > 0 ? (
            <div 
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: pptxSlides[currentSlideIndex] }}
            />
          ) : isPpt ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-slate-600">Loading PowerPoint...</div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-slate-600">Unsupported file type</div>
            </div>
          )}
        </div>
        
        {isPdf && (
          <div className="px-4 py-3 flex items-center gap-3 border-t">
            <Button variant={tool === 'pen' ? 'default' : 'ghost'} onClick={() => setTool('pen')}>Pen</Button>
            <Button variant={tool === 'eraser' ? 'default' : 'ghost'} onClick={() => setTool('eraser')}>Eraser</Button>
            <Button variant="ghost" onClick={() => {
              if (overlayCanvasRef.current) {
                const ctx = overlayCanvasRef.current.getContext('2d')!;
                ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
              }
            }}>Clear</Button>
          </div>
        )}
      </>
    );
  }

  async function gotoSlide(slideNumber: number) {
    if (working || !details) return;
    setWorking(true);
    try {
      await apiFetch(`/api/slideshow/${sessionId}/goto`, {
        method: 'POST',
        body: JSON.stringify({ slideNumber })
      });
      setDetails(prev => prev ? { ...prev, currentSlide: slideNumber } : null);
    } catch (e) {
      console.error('Failed to goto slide:', e);
    } finally {
      setWorking(false);
    }
  }

  return (<div className="min-h-dvh flex flex-col">{content}</div>);
}



