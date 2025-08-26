"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type SessionResponse = { id: string; title: string; currentSlide: number };
 type SlideItem = { id: string; index: number; imageUrl: string };
 type SlidesResponse = { slides: SlideItem[] };

export default function SlideshowViewPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [details, setDetails] = useState<SessionResponse | null>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const d = await apiFetch<SessionResponse>(`/api/slideshow/${sessionId}`);
        const s = await apiFetch<SlidesResponse>(`/api/slideshow/${sessionId}/slides`);
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
        const d = await apiFetch<SessionResponse>(`/api/slideshow/${sessionId}`);
        const s = await apiFetch<SlidesResponse>(`/api/slideshow/${sessionId}/slides`);
        if (!mounted) return;
        setDetails(prev => prev ? { ...prev, currentSlide: d.currentSlide } : { id: d.id, title: d.title, currentSlide: d.currentSlide });
        if (slides.length !== s.slides.length) setSlides(s.slides);
      } catch {
        /* noop */
      }
    }, 2000);
    return () => { mounted = false; window.clearInterval(id); };
  }, [sessionId, slides.length]);

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
      {/* Full-viewport slide stage (below sticky header) */}
      <div className="fixed inset-0 pt-[64px] sm:pt-[72px]">
        <div className="relative h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)]">
          {!slide ? (
            <div className="absolute inset-0 grid place-items-center p-6">
              <Card className="p-6 text-center">
                <div className="text-slate-600">Waiting for slides…</div>
              </Card>
            </div>
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="rounded-xl overflow-hidden shadow bg-white">
                <img
                  src={slide.imageUrl}
                  alt={`Slide ${slide.index}`}
                  className="block max-w-[100vw] max-h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-72px)] object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


