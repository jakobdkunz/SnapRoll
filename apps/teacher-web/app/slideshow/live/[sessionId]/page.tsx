"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export default function SlideshowLivePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const heartbeatRef = useRef<number | null>(null);

  const fileUrl = useMemo(() => {
    if (!details) return '';
    let path = details.filePath;
    // Normalize accidentally missing colon in protocol (e.g., https//)
    if (/^https\/\//i.test(path)) path = path.replace(/^https\/\//i, 'https://');
    if (/^http\/\//i.test(path)) path = path.replace(/^http\/\//i, 'http://');
    return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path}`;
  }, [details]);

  const pdfUrlWithPage = useMemo(() => {
    if (!details) return '';
    const page = Math.max(1, details.currentSlide || 1);
    // Most PDF viewers honor #page=N
    return `${fileUrl}#page=${page}`;
  }, [details, fileUrl]);

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

  async function gotoSlide(next: number) {
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
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!details) return;
      if (e.key === 'ArrowRight') gotoSlide(details.currentSlide + 1);
      if (e.key === 'ArrowLeft') gotoSlide(details.currentSlide - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [details]);

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center p-6"><div className="text-slate-600">Loading slideshow…</div></div>
    );
  }
  if (error || !details) {
    return (
      <div className="min-h-dvh grid place-items-center p-6"><div className="text-rose-700">{error || 'Not found'}</div></div>
    );
  }

  const isPdf = /pdf/i.test(details.mimeType);
  const isPpt = /(powerpoint|\.pptx?$)/i.test(details.mimeType) || /\.pptx?$/i.test(details.filePath);
  const officeEmbedUrl = isPpt ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : '';

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" onClick={closeAndBack} disabled={working}>Back</Button>
        <div className="text-lg font-semibold truncate">{details.title}</div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={() => gotoSlide(details.currentSlide - 1)} disabled={working || details.currentSlide <= 1}>Prev</Button>
          <div className="text-sm text-slate-600">Slide {Math.max(1, details.currentSlide)}{details.totalSlides ? ` / ${details.totalSlides}` : ''}</div>
          <Button onClick={() => gotoSlide(details.currentSlide + 1)} disabled={working}>Next</Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {isPdf ? (
          <iframe title="slides" src={pdfUrlWithPage} className="w-full h-full border-0" />
        ) : isPpt ? (
          <iframe title="slides" src={officeEmbedUrl} className="w-full h-full border-0" />
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
    </div>
  );
}



