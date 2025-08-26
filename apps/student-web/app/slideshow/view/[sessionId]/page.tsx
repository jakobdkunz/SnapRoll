"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

export default function SlideshowViewPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [details, setDetails] = useState<{ id: string; title: string; currentSlide: number } | null>(null);
  const [slides, setSlides] = useState<Array<{ id: string; index: number; imageUrl: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const d = await apiFetch<any>(`/api/slideshow/${sessionId}`);
        const s = await apiFetch<{ slides: Array<{ id: string; index: number; imageUrl: string }>}>(`/api/slideshow/${sessionId}/slides`);
        if (!mounted) return;
        setDetails({ id: d.id, title: d.title, currentSlide: d.currentSlide });
        setSlides(s.slides);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load slideshow');
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = window.setInterval(async () => {
      try {
        const d = await apiFetch<any>(`/api/slideshow/${sessionId}`);
        const s = await apiFetch<{ slides: Array<{ id: string; index: number; imageUrl: string }> }>(`/api/slideshow/${sessionId}/slides`);
        if (!mounted) return;
        setDetails(prev => prev ? { ...prev, currentSlide: d.currentSlide } : { id: d.id, title: d.title, currentSlide: d.currentSlide });
        if (slides.length !== s.slides.length) setSlides(s.slides);
      } catch {}
    }, 2000);
    return () => { mounted = false; window.clearInterval(id); };
  }, [sessionId]);

  if (loading) return <div className="min-h-dvh grid place-items-center p-6 text-slate-600">Loading…</div>;
  if (error || !details) return <div className="min-h-dvh grid place-items-center p-6 text-rose-700">{error || 'Not found'}</div>;

  const total = slides.length;
  const current = Math.min(Math.max(1, details.currentSlide || 1), Math.max(1, total || 1));
  const slide = slides[current - 1];

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>Back</Button>
        <div className="text-lg font-semibold truncate">{details.title}</div>
        <div className="ml-auto text-sm text-slate-600">Slide {current}{total ? ` / ${total}` : ''}</div>
      </div>
      <div className="flex-1 relative bg-black">
        {!slide ? (
          <div className="absolute inset-0 grid place-items-center p-6">
            <Card className="p-6 text-center">
              <div className="text-slate-600">Waiting for slides…</div>
            </Card>
          </div>
        ) : (
          <img src={slide.imageUrl} alt={`Slide ${slide.index}`} className="absolute inset-0 w-full h-full object-contain" />
        )}
      </div>
    </div>
  );
}


