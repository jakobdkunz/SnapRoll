"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery } from 'convex/react';
import { convex } from '@snaproll/convex-client';
import { HiOutlineArrowLeft } from 'react-icons/hi2';

type DrawingColor = 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'white';
type DrawingPoint = { x: number; y: number };
type DrawingStroke = { color: DrawingColor; points: DrawingPoint[]; mode: 'pen' | 'eraser' };
type SlideDrawings = { [slideIndex: number]: DrawingStroke[] };

type SessionResponse = { id: string; title: string; currentSlide: number };
 type SlideItem = { id: string; index: number; imageUrl: string };
 type SlidesResponse = { slides: SlideItem[] };

export default function SlideshowViewPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [error, setError] = useState<string | null>(null);

  // Convex hooks
  const details = useQuery(api.functions.slideshow.getActiveSession, { sessionId: sessionId as any });
  const slides = useQuery(api.functions.slideshow.getSlides, { sessionId: sessionId as any });
  const drawings = useQuery(api.functions.slideshow.getDrawings, { sessionId: sessionId as any });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  
  // Drawing state
  const [showDrawings, setShowDrawings] = useState(true);
  const [localDrawings, setLocalDrawings] = useState<SlideDrawings>({});
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

  // Set loading state based on Convex queries
  const loading = !details || !slides;

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

  // Initialize canvas when frame size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameSize) return;
    
    canvas.width = frameSize.w;
    canvas.height = frameSize.h;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctxRef.current = ctx;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [frameSize]);

  // Extract drawings from Convex data
  const slideDrawings: Record<number, DrawingStroke[]> = (drawings as any) || {};

  // Redraw all strokes when drawings change or showDrawings changes or frame size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !frameSize) {
      console.log('Canvas not ready for redraw:', { canvas: !!canvas, ctx: !!ctx, frameSize });
      return;
    }
    
    const currentSlideIndex = details?.currentSlide || 1;
    const currentSlideDrawings = slideDrawings[currentSlideIndex] || [];
    console.log('Redrawing canvas with', currentSlideDrawings.length, 'strokes, showDrawings:', showDrawings);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!showDrawings) return;
    
    currentSlideDrawings.forEach((stroke: DrawingStroke, index: number) => {
      if (stroke.points.length < 2) return;
      
      console.log(`Drawing stroke ${index}:`, stroke);
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
  }, [slideDrawings, showDrawings, frameSize, details?.currentSlide]);

  if (loading) return <div className="min-h-dvh grid place-items-center p-6 text-slate-600">Loading…</div>;
  if (error || !details) return <div className="min-h-dvh grid place-items-center p-6 text-rose-700">{error || 'Not found'}</div>;

  const total = (slides as any).length;
  const current = Math.min(Math.max(1, (details as any).currentSlide || 1), Math.max(1, total || 1));
  const slide = (slides as any)[current - 1];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white z-50">
      <div ref={navRef} className="px-4 py-3 flex items-center gap-3 border-b bg-white/80 backdrop-blur">
        <Button variant="ghost" onClick={() => router.push('/sections')}>
          <HiOutlineArrowLeft className="h-5 w-5 mr-1" />
          Back
        </Button>
        <div className="text-lg font-semibold truncate">{(details as any).title}</div>
        
        {/* Drawing toggle */}
        <div className="flex items-center gap-2 ml-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDrawings}
              onChange={(e) => setShowDrawings(e.target.checked)}
              className="w-4 h-4"
            />
            Show drawings
          </label>
        </div>
        
        <div className="ml-auto text-sm text-slate-600">Slide {current}{total ? ` / ${total}` : ''}</div>
      </div>
      {/* Full-width stage that fills remaining space */}
      <div className="flex-1 relative">
        <div
          ref={stageRef}
          className="relative w-full h-full"
        >
          {!slide ? (
            <div className="absolute inset-0 grid place-items-center p-6">
              <Card className="p-6 text-center">
                <div className="text-slate-600">Waiting for slides…</div>
              </Card>
            </div>
          ) : (
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
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


