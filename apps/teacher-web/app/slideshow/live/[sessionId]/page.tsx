"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
import { api } from '@snaproll/convex-client';
// import type { Id } from '../../../../../convex/_generated/dataModel';
import { useQuery, useMutation } from 'convex/react';
import { HiOutlineArrowLeft } from 'react-icons/hi2';

type DrawingMode = 'mouse' | 'pen' | 'eraser';
type DrawingColor = 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'white';
type DrawingPoint = { x: number; y: number };
type DrawingStroke = { color: DrawingColor; points: DrawingPoint[]; mode: DrawingMode };
type SlideDrawings = { [slideIndex: number]: DrawingStroke[] };

// (removed unused SessionDetails and Slide type declarations)

export default function SlideshowPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderMsg, setRenderMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Convex hooks
  const details = useQuery(api.functions.slideshow.getActiveSession, { sessionId: params.sessionId as any });
  const section = useQuery(api.functions.sections.get, (details as any)?.sectionId ? { id: (details as any).sectionId as any } : "skip");
  const slidesQuery = useQuery(api.functions.slideshow.getSlides, { sessionId: params.sessionId as any }) as any[];
  const [slides, setSlides] = useState<any[]>([]);
  const drawings = (useQuery(api.functions.slideshow.getDrawings, { sessionId: params.sessionId as any }) as any) || {};
  const heartbeat = useMutation(api.functions.slideshow.heartbeat);
  const closeSession = useMutation(api.functions.slideshow.closeSession);
  const gotoSlideMutation = useMutation(api.functions.slideshow.gotoSlide);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  
  // Drawing state
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('mouse');
  const [drawingColor, setDrawingColor] = useState<DrawingColor>('red');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [localDrawings, setLocalDrawings] = useState<SlideDrawings>({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const eraserRadius = 0.025; // 2.5% of canvas size - matches visual circle

  // Sync local slides state from Convex query
  useEffect(() => {
    if (Array.isArray(slidesQuery)) {
      setSlides(slidesQuery as any[]);
    }
  }, [slidesQuery]);

  function recomputeFrame(aspect: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    // Account for padding (p-2 sm:p-4 = 8px on mobile, 16px on desktop)
    const padding = window.innerWidth >= 640 ? 32 : 16; // 16px on each side
    const stageW = rect.width - padding;
    const stageH = rect.height - padding;
    if (stageW <= 0 || stageH <= 0) return;
    let w: number;
    let h: number;
    if (stageW / stageH > aspect) {
      h = stageH;
      w = h * aspect;
    } else {
      w = stageW;
      h = w / aspect;
    }
    setFrameSize({ w, h });
  }

  const renderHostRef = useRef<HTMLDivElement | null>(null);

  // Drawing functions
  const getCanvasCoordinates = useCallback((e: React.MouseEvent | MouseEvent): DrawingPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas || !frameSize) {
      if (process.env.NEXT_PUBLIC_SLIDESHOW_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.log('Canvas or frameSize not available:', { canvas: !!canvas, frameSize });
      }
      return null;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store as percentages (0-1) of the frame size for proper scaling
    const percentX = x / rect.width;
    const percentY = y / rect.height;
    
    const result = { x: percentX, y: percentY };
    if (process.env.NEXT_PUBLIC_SLIDESHOW_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.log('Percentage coordinates:', { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY, rect, x, y, percentX, percentY, result });
    }
    return result;
  }, [frameSize]);

  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (drawingMode !== 'pen' && drawingMode !== 'eraser') return;
    
    e.preventDefault();
    const point = getCanvasCoordinates(e);
    if (!point) return;
    
    if (process.env.NEXT_PUBLIC_SLIDESHOW_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.log('Start drawing at:', point);
    }
    setIsDrawing(true);
    
    if (drawingMode === 'eraser') {
      // For eraser, we'll handle stroke removal in the draw function
      setCurrentStroke(null);
    } else {
      const newStroke: DrawingStroke = { color: drawingColor, points: [point], mode: drawingMode };
      setCurrentStroke(newStroke);
      
      // Draw initial point
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        // Convert percentage coordinates to canvas pixels for real-time drawing
        const canvas = canvasRef.current;
        if (canvas) {
          ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
          ctx.stroke();
        }
      }
    }
  }, [drawingMode, drawingColor, getCanvasCoordinates]);

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || (drawingMode !== 'pen' && drawingMode !== 'eraser')) return;
    
    e.preventDefault();
    const point = getCanvasCoordinates(e);
    if (!point) return;
    
    if (drawingMode === 'eraser') {
      // Eraser mode: remove strokes that intersect with the eraser
              const currentSlideIndex = details?.currentSlide || 1;
        const currentSlideDrawings = (drawings as any)[currentSlideIndex] || [];
        
        const newSlideDrawings = (currentSlideDrawings as any[]).filter((stroke: DrawingStroke) => {
        // Check if any point in the stroke is within eraser radius
        return !stroke.points.some((strokePoint: DrawingPoint) => {
          const distance = Math.sqrt(
            Math.pow(strokePoint.x - point.x, 2) + Math.pow(strokePoint.y - point.y, 2)
          );
          // The visual circle uses eraserRadius * minFrameSize pixels
          // Convert to percentage by dividing by the canvas size
          const minFrameSize = Math.min(frameSize?.w || 1, frameSize?.h || 1);
          const canvas = canvasRef.current;
          const canvasSize = canvas ? Math.min(canvas.width, canvas.height) : minFrameSize;
          const percentageRadius = (eraserRadius * minFrameSize) / canvasSize;
          return distance < percentageRadius;
        });
      });
      
      const newDrawings = { ...(drawings as any), [currentSlideIndex]: newSlideDrawings };
      
      // Redraw canvas immediately
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas && ctx && frameSize) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        newSlideDrawings.forEach((stroke: DrawingStroke) => {
          if (stroke.points.length < 2) return;
          
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          
          const firstPoint = stroke.points[0];
          ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
          
          for (let i = 1; i < stroke.points.length; i++) {
            const strokePoint = stroke.points[i];
            ctx.lineTo(strokePoint.x * canvas.width, strokePoint.y * canvas.height);
          }
          
          ctx.stroke();
        });
      }
    } else {
      // Pen mode: continue drawing
      if (!currentStroke) return;
      
      const updatedStroke = { ...currentStroke, points: [...currentStroke.points, point] };
      setCurrentStroke(updatedStroke);
      
      // Draw line in real-time
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        // Convert percentage coordinates to canvas pixels for real-time drawing
        const lastPoint = currentStroke.points[currentStroke.points.length - 1];
        const canvas = canvasRef.current;
        if (canvas) {
          ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
          ctx.stroke();
        }
      }
    }
  }, [isDrawing, drawingMode, currentStroke, drawingColor, getCanvasCoordinates, drawings, details?.currentSlide, frameSize]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (drawingMode === 'eraser') {
      // For eraser, we don't need to save anything since we already updated the drawings state
      // Just save the current state to server
      if (process.env.NEXT_PUBLIC_SLIDESHOW_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.log('Saving drawings after eraser use:', drawings);
      }
      // Persist via Convex if implemented in future
    } else if (currentStroke) {
      // Pen mode: save the completed stroke
      const currentSlideIndex = details?.currentSlide || 1;
      const currentSlideDrawings = (drawings as any)[currentSlideIndex] || [];
      const newSlideDrawings = [...currentSlideDrawings, currentStroke];
      const newDrawings = { ...(drawings as any), [currentSlideIndex]: newSlideDrawings };
      setLocalDrawings(newDrawings);
      setCurrentStroke(null);
      
      // Save drawings to server
      // Persist via Convex if implemented
    }
  }, [isDrawing, currentStroke, drawings, sessionId, details?.currentSlide, drawingMode]);

  const clearDrawings = useCallback(() => {
    const currentSlideIndex = details?.currentSlide || 1;
    const newDrawings = { ...(drawings as any) };
    delete newDrawings[currentSlideIndex];
    setLocalDrawings(newDrawings);
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Persist via Convex if implemented
  }, [sessionId, drawings, details?.currentSlide]);

  // Initialize canvas when frame size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameSize) {
      if (process.env.NEXT_PUBLIC_SLIDESHOW_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.log('Canvas init skipped:', { canvas: !!canvas, frameSize });
      }
      return;
    }
    
    if (process.env.NEXT_PUBLIC_SLIDESHOW_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.log('Initializing canvas with size:', frameSize);
    }
    canvas.width = frameSize.w;
    canvas.height = frameSize.h;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctxRef.current = ctx;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (process.env.NEXT_PUBLIC_SLIDESHOW_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.log('Canvas context initialized');
      }
    } else {
      console.error('Failed to get canvas context');
    }
  }, [frameSize]);

  // Redraw all strokes when drawings change or frame size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !frameSize) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const currentSlideIndex = details?.currentSlide || 1;
    const currentSlideDrawings = (drawings as any)[currentSlideIndex] || [];
    
    currentSlideDrawings.forEach((stroke: DrawingStroke) => {
      if (stroke.points.length < 2) return;
      
      ctx.strokeStyle = stroke.mode === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.mode === 'eraser' ? 20 : 3;
      ctx.beginPath();
      
      // Scale percentage coordinates to current canvas size
      const firstPoint = stroke.points[0];
      ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
      
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
      }
      
      ctx.stroke();
    });
  }, [drawings, frameSize, details?.currentSlide]);

  // Load session details
  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        if (cancelled) return;
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Session not found');
      }
    }
    loadSession();
    return () => { cancelled = true; };
  }, [sessionId]);

  // Remove redundant polling; `slidesQuery` already subscribes via Convex useQuery
  // (left intentionally blank)

  // Heartbeat (10s) to keep session fresh; pause when hidden, immediate on visible
  useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id !== null) return;
      try { void heartbeat({ sessionId: params.sessionId as any }); } catch {}
      id = window.setInterval(() => { try { void heartbeat({ sessionId: params.sessionId as any }); } catch {} }, 10000);
    };
    const stop = () => { if (id !== null) { window.clearInterval(id); id = null; } };
    const onVis = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [sessionId, heartbeat]);

  // Recompute frame on resize
  useEffect(() => {
    if (!imgAspect) return;
    const onResize = () => recomputeFrame(imgAspect);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [imgAspect]);

  // Recompute frame when aspect changes or on resize
  useEffect(() => {
    if (!imgAspect) return;
    const onResize = () => recomputeFrame(imgAspect);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [imgAspect]);

  const gotoSlide = useCallback(async (slideNumber: number) => {
    if (working || !details) return;
    setWorking(true);
    try {
      await gotoSlideMutation({ sessionId: params.sessionId as any, slideNumber });
    } catch (e) {
      console.error('Failed to goto slide:', e);
    } finally {
      setWorking(false);
    }
  }, [working, details, sessionId]);

  // Keyboard navigation
  useEffect(() => {
    if (!slides.length) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const total = slides.length;
        const current = Math.min(Math.max(1, details?.currentSlide || 1), total);
        if (current > 1) {
          gotoSlide(current - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const total = slides.length;
        const current = Math.min(Math.max(1, details?.currentSlide || 1), total);
        if (current < total) {
          gotoSlide(current + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, details?.currentSlide, gotoSlide]);

  const rawFileUrl = (details as any)?.filePath as string | undefined;
  const isPdf = !!details && (
    /pdf/i.test(((details as any)?.mimeType || '').toString()) ||
    /\.pdf(\?|#|$)/i.test(((details as any)?.filePath || '').toString())
  );
  const proxiedFileUrl = useMemo(() => {
    if (!rawFileUrl) return '';
    try {
      const u = new URL(rawFileUrl);
      const host = u.hostname.toLowerCase();
      return rawFileUrl;
    } catch {
      return rawFileUrl;
    }
  }, [rawFileUrl]);

  async function closeAndBack() {
    if (working) return;
    setWorking(true);
    try {
      await closeSession({ sessionId: params.sessionId as any });
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





  async function ensurePdfJs() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWin = window as any;
    if (!anyWin.pdfjsLib) {
      // Use legacy UMD build which exposes window.pdfjsLib
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    await fetch(`/api/slideshow/${sessionId}/slides`, { method: 'POST', body: fd, credentials: 'include' });
  }

  async function renderPdfToPngs() {
    setRendering(true);
    setRenderMsg('Loading PDF…');
    try {
      await ensurePdfJs();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error('PDF.js library not loaded');
      const doc = await pdfjsLib.getDocument({ url: proxiedFileUrl }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        setRenderMsg(`Rendering slide ${i}/${doc.numPages}…`);
        const page = await doc.getPage(i);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const viewport = page.getViewport({ scale: 3 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.width = viewport.width;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), 'image/png'));
        await uploadPng(i, blob, canvas.width, canvas.height);
      }
      setRenderMsg('Done. Refreshing…');
      try {
        const res = await fetch(`/api/slideshow/${sessionId}/slides`, { credentials: 'include' });
        const json = await res.json();
        setRenderMsg('');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSlides(((json as any)?.slides || []) as any[]);
      } catch {
        // ignore
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to render PDF');
    } finally {
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
          <div className="text-slate-600 mb-4">
            {isPdf ? (
              <>We will pre-render your PDF into per-slide PNGs on your device and upload them for students to view.</>
            ) : (
              <>We will pre-render your file into per-slide PNGs on your device and upload them for students to view.</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button 
              disabled={rendering} 
              onClick={() => { 
                if (isPdf) void renderPdfToPngs(); 
                else setError('Unsupported file'); 
              }}
            >
              {rendering ? 'Rendering…' : 'Render now'}
            </Button>
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
        <div ref={navRef} className="px-4 py-3 flex items-center gap-3 border-b bg-white/80 backdrop-blur">
          <Button variant="ghost" onClick={closeAndBack} disabled={working}>
            <HiOutlineArrowLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
          <div className="text-lg font-semibold truncate">{(details as any).title}</div>
          
          {/* Drawing controls - centered */}
          <div className="flex items-center gap-2 mx-auto">
            <div className="flex items-center gap-1">
              <Button 
                variant={drawingMode === 'mouse' ? 'primary' : 'ghost'} 
                onClick={() => setDrawingMode('mouse')}
                className="p-2 -ml-1"
                title="Mouse mode"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                </svg>
              </Button>
              <Button 
                variant={drawingMode === 'pen' ? 'primary' : 'ghost'} 
                onClick={() => setDrawingMode('pen')}
                className="p-2"
                title="Pen tool"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Button>
            </div>
            
            {/* Color palette - always visible */}
            <div className="flex items-center gap-1">
              {(['red', 'blue', 'green', 'yellow', 'black', 'white'] as DrawingColor[]).map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 ${
                    drawingColor === color ? 'border-slate-800' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setDrawingColor(color);
                    setDrawingMode('pen'); // Switch to pen mode when color is selected
                  }}
                  title={color}
                />
              ))}
            </div>
            
            {/* Eraser and Clear buttons */}
            <div className="flex items-center gap-1">
              <Button 
                variant={drawingMode === 'eraser' ? 'primary' : 'ghost'} 
                onClick={() => setDrawingMode('eraser')}
                className="text-sm px-2 py-1"
                title="Eraser tool"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" fill="rgba(239, 68, 68, 0.2)" stroke="rgb(239, 68, 68)" />
                </svg>
                Eraser
              </Button>
              <Button variant="ghost" onClick={clearDrawings} className="text-sm px-2 py-1 !text-red-600" title="Clear drawings">
                Clear
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => gotoSlide(current - 1)} disabled={working || current <= 1}>Prev</Button>
            <span className="text-sm text-slate-600">{current} / {total}</span>
            <Button variant="ghost" onClick={() => gotoSlide(current + 1)} disabled={working || current >= total}>Next</Button>
          </div>
        </div>
        {/* Full-width stage that fills remaining space */}
        <div className="flex-1 relative">
          <div ref={stageRef} className="relative w-full h-full">
            <div className="absolute inset-0 p-2 sm:p-4 grid place-items-center">
              <div
                className="rounded-xl overflow-hidden shadow bg-white flex items-center justify-center relative"
                style={frameSize ? { width: `${frameSize.w}px`, height: `${frameSize.h}px` } : undefined}
              >
                <img
                  src={slide.imageUrl}
                  alt={`Slide ${slide.index}`}
                  ref={imgRef}
                  className="block w-full h-full object-contain"
                  onLoad={() => {
                    const el = imgRef.current;
                    if (!el) return;
                    const nw = el.naturalWidth || 0;
                    const nh = el.naturalHeight || 0;
                    if (nw > 0 && nh > 0) {
                      const aspect = nw / nh;
                      setImgAspect(aspect);
                      recomputeFrame(aspect);
                    }
                  }}
                />
                
                {/* Drawing canvas overlay */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full ${
                    drawingMode === 'pen' ? 'cursor-crosshair' : 
                    drawingMode === 'eraser' ? 'cursor-none' : 'cursor-pointer'
                  }`}
                  onMouseDown={startDrawing}
                  onMouseMove={(e) => {
                    draw(e);
                    if (drawingMode === 'eraser') {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMousePosition({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                    }
                  }}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onClick={() => {
                    if (drawingMode === 'mouse') {
                      const total = slides.length;
                      const current = Math.min(Math.max(1, details?.currentSlide || 1), total);
                      if (current < total) {
                        gotoSlide(current + 1);
                      } else {
                        gotoSlide(1);
                      }
                    }
                  }}
                  title={drawingMode === 'mouse' ? 'Click to advance to next slide' : 'Draw on the slide'}
                  style={{ 
                    border: drawingMode === 'pen' ? '1px solid rgba(255,0,0,0.3)' : 'none',
                    pointerEvents: 'auto'
                  }}
                />
                
                {/* Custom eraser cursor */}
                {drawingMode === 'eraser' && frameSize && (
                  <div 
                    className="absolute pointer-events-none z-50 border-2 border-red-500 rounded-full bg-red-500/20"
                    style={{
                      width: `${eraserRadius * Math.min(frameSize.w, frameSize.h) * 2}px`,
                      height: `${eraserRadius * Math.min(frameSize.w, frameSize.h) * 2}px`,
                      left: mousePosition.x - (eraserRadius * Math.min(frameSize.w, frameSize.h)),
                      top: mousePosition.y - (eraserRadius * Math.min(frameSize.w, frameSize.h)),
                      transform: 'translate(0, 0)'
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white z-50">
      {/* Keep white base to maximize canvas, but add subtle background layers behind content */}
      <div className={`pointer-events-none fixed inset-0 ${section?.gradient || 'gradient-1'}`} style={{ opacity: 0.2 }} />
      <div className="pointer-events-none fixed inset-0 bg-white/50" />
      <div className="pointer-events-none fixed -inset-[20%] opacity-20 animate-[gradient_drift_14s_linear_infinite]" style={{ background: 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.24), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.24), transparent)' }} />
      <style jsx>{`
        @keyframes gradient_drift {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(2%, -2%, 0) scale(1.02); }
          100% { transform: translate3d(0,0,0); }
        }
      `}</style>
      {/* Render content above background; header remains compact to preserve stage space */}
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
