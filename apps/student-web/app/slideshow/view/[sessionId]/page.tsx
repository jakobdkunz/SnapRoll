"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@snaproll/ui';
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

export default function SlideshowViewPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const d = await apiFetch<SessionDetails>(`/api/slideshow/${sessionId}`);
        if (!mounted) return;
        setDetails(d);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load slideshow');
      } finally {
        setLoading(false);
      }
    }
    load();
    const id = window.setInterval(load, 3500);
    return () => { mounted = false; window.clearInterval(id); };
  }, [sessionId]);

  const fileUrl = useMemo(() => {
    if (!details) return '';
    let path = details.filePath;
    if (/^https\/\//i.test(path)) path = path.replace(/^https\/\//i, 'https://');
    if (/^http\/\//i.test(path)) path = path.replace(/^http\/\//i, 'http://');
    return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path}`;
  }, [details]);
  const pageUrl = useMemo(() => {
    if (!details) return '';
    const page = Math.max(1, details.currentSlide || 1);
    return `${fileUrl}#page=${page}`;
  }, [details, fileUrl]);

  if (loading) return <div className="min-h-dvh grid place-items-center p-6 text-slate-600">Loading…</div>;
  if (error || !details) return <div className="min-h-dvh grid place-items-center p-6 text-rose-700">{error || 'Not found'}</div>;

  const isPdf = /pdf/i.test(details.mimeType);
  const isPpt = /(powerpoint|\.pptx?$)/i.test(details.mimeType) || /\.pptx?$/i.test(details.filePath);
  const officeEmbedUrl = useMemo(() => {
    if (!isPpt) return '';
    const src = encodeURIComponent(fileUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${src}`;
  }, [isPpt, fileUrl]);

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>Back</Button>
        <div className="text-lg font-semibold truncate">{details.title}</div>
        <div className="ml-auto text-sm text-slate-600">Slide {Math.max(1, details.currentSlide)}{details.totalSlides ? ` / ${details.totalSlides}` : ''}</div>
      </div>
      <div className="flex-1 min-h-0">
        {isPdf ? (
          <iframe title="slides" src={pageUrl} className="w-full h-full border-0" />
        ) : isPpt ? (
          <iframe title="slides" src={officeEmbedUrl} className="w-full h-full border-0" />
        ) : (
          <div className="h-full grid place-items-center p-6">
            <Card className="p-6 text-center max-w-lg">
              <div className="text-lg font-semibold mb-2">Preview not supported</div>
              <div className="text-slate-600 mb-4">This file type cannot be embedded.</div>
              {details.allowDownload && (
                <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white" href={fileUrl} target="_blank" rel="noreferrer">Download</a>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}


