"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
import { apiFetch, getApiBaseUrl } from '@snaproll/api-client';

type DrawingMode = 'mouse' | 'pen' | 'eraser';
type DrawingColor = 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'white';
type DrawingPoint = { x: number; y: number };
type DrawingStroke = { color: DrawingColor; points: DrawingPoint[]; mode: DrawingMode };
type SlideDrawings = { [slideIndex: number]: DrawingStroke[] };

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
  const [drawings, setDrawings] = useState<SlideDrawings>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

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
      console.log('Canvas or frameSize not available:', { canvas: !!canvas, frameSize });
      return null;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store as percentages (0-1) of the frame size for proper scaling
    const percentX = x / rect.width;
    const percentY = y / rect.height;
    
    const result = { x: percentX, y: percentY };
    console.log('Percentage coordinates:', { clientX: e.clientX, clientY: e.clientY, rect, x, y, percentX, percentY, result });
    return result;
  }, [frameSize]);

  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (drawingMode !== 'pen' && drawingMode !== 'eraser') return;
    
    e.preventDefault();
    const point = getCanvasCoordinates(e);
    if (!point) return;
    
    console.log('Start drawing at:', point);
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
      const currentSlideDrawings = drawings[currentSlideIndex] || [];
      const eraserRadius = 0.02; // 2% of canvas size
      
      const newSlideDrawings = currentSlideDrawings.filter((stroke: DrawingStroke) => {
        // Check if any point in the stroke is within eraser radius
        return !stroke.points.some((strokePoint: DrawingPoint) => {
          const distance = Math.sqrt(
            Math.pow(strokePoint.x - point.x, 2) + Math.pow(strokePoint.y - point.y, 2)
          );
          return distance < eraserRadius;
        });
      });
      
      const newDrawings = { ...drawings, [currentSlideIndex]: newSlideDrawings };
      setDrawings(newDrawings);
      
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
      console.log('Saving drawings after eraser use:', drawings);
      apiFetch(`/api/slideshow/${sessionId}/drawings`, {
        method: 'POST',
        body: JSON.stringify({ drawings })
      }).then(() => console.log('Drawings saved successfully'))
        .catch(error => console.error('Failed to save drawings:', error));
    } else if (currentStroke) {
      // Pen mode: save the completed stroke
      const currentSlideIndex = details?.currentSlide || 1;
      const currentSlideDrawings = drawings[currentSlideIndex] || [];
      const newSlideDrawings = [...currentSlideDrawings, currentStroke];
      const newDrawings = { ...drawings, [currentSlideIndex]: newSlideDrawings };
      setDrawings(newDrawings);
      setCurrentStroke(null);
      
      // Save drawings to server
      console.log('Saving drawings to server:', newDrawings);
      apiFetch(`/api/slideshow/${sessionId}/drawings`, {
        method: 'POST',
        body: JSON.stringify({ drawings: newDrawings })
      }).then(() => console.log('Drawings saved successfully'))
        .catch(error => console.error('Failed to save drawings:', error));
    }
  }, [isDrawing, currentStroke, drawings, sessionId, details?.currentSlide, drawingMode]);

  const clearDrawings = useCallback(() => {
    const currentSlideIndex = details?.currentSlide || 1;
    const newDrawings = { ...drawings };
    delete newDrawings[currentSlideIndex];
    setDrawings(newDrawings);
    
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Save updated drawings to server
    console.log('Clearing drawings on server');
    apiFetch(`/api/slideshow/${sessionId}/drawings`, {
      method: 'POST',
      body: JSON.stringify({ drawings: newDrawings })
    }).then(() => console.log('Drawings cleared successfully'))
      .catch(error => console.error('Failed to clear drawings:', error));
  }, [sessionId, drawings, details?.currentSlide]);

  // Initialize canvas when frame size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameSize) {
      console.log('Canvas init skipped:', { canvas: !!canvas, frameSize });
      return;
    }
    
    console.log('Initializing canvas with size:', frameSize);
    canvas.width = frameSize.w;
    canvas.height = frameSize.h;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctxRef.current = ctx;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      console.log('Canvas context initialized');
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
    const currentSlideDrawings = drawings[currentSlideIndex] || [];
    
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
    try {
      // Ensure jQuery AJAX uses credentials for our proxy
      anyWin.$?.ajaxSetup?.({ xhrFields: { withCredentials: true } });
      // Log ajax errors to render logs
      anyWin.$?.(document).off('ajaxError.__pptx').on('ajaxError.__pptx', (_evt: any, jqxhr: any, settings: any, thrown: any) => {
        addLog(`ajaxError: url=${settings?.url} status=${jqxhr?.status} thrown=${thrown}`);
      });
    } catch {}
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
      async function tryRenderWithUrl(url: string): Promise<'reveal' | 'div'> {
        addLog(`Rendering via URL: ${url.substring(0, 80)}…`);
        // First attempt: revealjs mode
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
        let start = Date.now();
        while (Date.now() - start < 8000) {
          const hasReveal = host.querySelector('.reveal .slides section');
          if (hasReveal) { addLog('Reveal DOM detected'); return 'reveal'; }
          await new Promise((r) => setTimeout(r, 200));
        }
        addLog('Reveal mode did not initialize, trying div mode…');
        host.innerHTML = '';
        // Second attempt: basic div mode
        $(host).pptxToHtml({
          pptxFileUrl: url,
          slideMode: true,
          slidesScale: '100%',
          keyBoardShortCut: false,
          mediaProcess: true,
          slideType: 'div',
          after: () => { /* noop */ },
        });
        start = Date.now();
        while (Date.now() - start < 8000) {
          const anySlide = host.querySelector('.slide, section, .pptx, .reveal .slides section');
          if (anySlide) { addLog('Div mode DOM detected'); return 'div'; }
          await new Promise((r) => setTimeout(r, 200));
        }
        const innerLen = host.innerHTML.length;
        addLog(`Renderer did not initialize; host.innerHTML length=${innerLen}`);
        throw new Error('Renderer did not initialize');
      }
      // First attempt: use (proxied) URL
      let mode: 'reveal' | 'div' | null = null;
      await Promise.race([
        (async () => { mode = await tryRenderWithUrl(pptxSourceUrl); rendered = true; })(),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timed out loading PPTX via URL')), 15000)),
      ]).catch(async (err) => {
        addLog(`URL render failed: ${err instanceof Error ? err.message : String(err)}`);
        console.warn('URL render failed, falling back to ObjectURL:', err);
        // Fallback: fetch as ArrayBuffer and render via Object URL (avoids CORS issues)
        const resp = await fetch(pptxSourceUrl, { credentials: 'include' as RequestCredentials });
        if (!resp.ok) throw new Error(`Fetch PPTX failed (${resp.status})`);
        const buf = await resp.arrayBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        addLog(`Fetched PPTX bytes=${buf.byteLength}`);
        // Attempt 1: pass Blob directly via pptxFile in reveal mode
        await (async () => {
          addLog('Attempting render with pptxFile Blob (reveal)…');
          $(host).pptxToHtml({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - third-party plugin accepts pptxFile
            pptxFile: blob,
            slideMode: true,
            slidesScale: '100%',
            keyBoardShortCut: false,
            mediaProcess: true,
            slideType: 'revealjs',
            revealjsPath: '/vendor/',
            revealjsConfig: { controls: false, progress: false, embedded: true, width: 1280, height: 720 },
          });
          const start = Date.now();
          while (Date.now() - start < 8000) {
            const hasReveal = host.querySelector('.reveal .slides section');
            if (hasReveal) { addLog('Reveal DOM detected (blob)'); mode = 'reveal'; rendered = true; return; }
            await new Promise((r) => setTimeout(r, 200));
          }
          addLog('Blob reveal mode did not initialize, trying div mode…');
          host.innerHTML = '';
          $(host).pptxToHtml({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - third-party plugin accepts pptxFile
            pptxFile: blob,
            slideMode: true,
            slidesScale: '100%',
            keyBoardShortCut: false,
            mediaProcess: true,
            slideType: 'div',
          });
          const start2 = Date.now();
          while (Date.now() - start2 < 8000) {
            const anySlide = host.querySelector('.slide, section, .pptx, .reveal .slides section');
            if (anySlide) { addLog('Div mode DOM detected (blob)'); mode = 'div'; rendered = true; return; }
            await new Promise((r) => setTimeout(r, 200));
          }
        })();
        if (!rendered) {
          // As a last resort, try ObjectURL path again (some builds prefer it)
          const objUrl = URL.createObjectURL(blob);
          addLog('Final attempt: ObjectURL path…');
          await Promise.race([
            (async () => { mode = await tryRenderWithUrl(objUrl); rendered = true; })(),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timed out loading PPTX via ObjectURL')), 20000)),
          ]).finally(() => URL.revokeObjectURL(objUrl));
        }
      });
      const Reveal = (window as any).Reveal;
      let total = 1;
      if (mode === 'reveal') {
        total = typeof Reveal?.getTotalSlides === 'function' ? Reveal.getTotalSlides() : (host.querySelectorAll('.reveal .slides section').length || 1);
      } else {
        total = host.querySelectorAll('.reveal .slides section, .slide, section').length || 1;
      }
      const html2canvas = (window as any).html2canvas as (node: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>;
      for (let i = 0; i < total; i++) {
        setRenderMsg(`Rendering slide ${i + 1}/${total}…`);
        if (mode === 'reveal' && Reveal && typeof Reveal.slide === 'function') Reveal.slide(i);
        await new Promise((r) => setTimeout(r, 150));
        const container = mode === 'reveal' ? (host.querySelector('.reveal') as HTMLElement | null) : (host as HTMLElement);
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
          {!!renderLogs.length && (
            <div className="mt-4 max-h-48 overflow-auto rounded bg-slate-100 text-slate-800 text-xs p-2 whitespace-pre-wrap">
              {renderLogs.join('\n')}
            </div>
          )}
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
          <Button variant="ghost" onClick={closeAndBack} disabled={working}>Back</Button>
          <div className="text-lg font-semibold truncate">{details.title}</div>
          
          {/* Drawing controls */}
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-1">
              <Button 
                variant={drawingMode === 'mouse' ? 'primary' : 'ghost'} 
                onClick={() => setDrawingMode('mouse')}
                className="p-2"
                title="Mouse mode"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <Button 
                variant={drawingMode === 'eraser' ? 'primary' : 'ghost'} 
                onClick={() => setDrawingMode('eraser')}
                className="p-2"
                title="Eraser tool"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </Button>
            </div>
            
            {(drawingMode === 'pen' || drawingMode === 'eraser') && (
              <>
                {drawingMode === 'pen' && (
                  <div className="flex items-center gap-1">
                    {(['red', 'blue', 'green', 'yellow', 'black', 'white'] as DrawingColor[]).map(color => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 ${
                          drawingColor === color ? 'border-slate-800' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setDrawingColor(color)}
                        title={color}
                      />
                    ))}
                  </div>
                )}
                <Button variant="ghost" onClick={clearDrawings} className="p-2" title="Clear drawings">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </>
            )}
          </div>
          
          <div className="ml-auto flex items-center gap-2">
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
                    drawingMode === 'pen' ? 'cursor-crosshair' : 'cursor-pointer'
                  }`}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onClick={(e) => {
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
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white z-50">
      {content}
    </div>
  );
}
