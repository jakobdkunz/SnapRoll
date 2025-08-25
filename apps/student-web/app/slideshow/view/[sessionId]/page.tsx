"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@snaproll/ui';
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

export default function SlideshowViewPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { sessionId } = params;
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pptContainerRef = useRef<HTMLDivElement | null>(null);
  const [debug, setDebug] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const d = await apiFetch<SessionDetails>(`/api/slideshow/${sessionId}`);
        if (!mounted) return;
        setDetails(d);
        setDebug(`Loaded: ${d.id} mime=${d.mimeType} officeMode=${String(d.officeMode)} currentSlide=${d.currentSlide}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load slideshow');
      } finally {
        setLoading(false);
      }
    }
    load();
    // Poll less aggressively to avoid flicker; only update currentSlide if changed
    const id = window.setInterval(async () => {
      try {
        const d = await apiFetch<SessionDetails>(`/api/slideshow/${sessionId}`);
        if (!mounted) return;
        setDetails((prev) => {
          if (!prev) return d;
          if (prev.currentSlide !== d.currentSlide) return { ...prev, currentSlide: d.currentSlide };
          return prev;
        });
      } catch (_e) {
        // ignore
      }
    }, 2000);
    return () => { mounted = false; window.clearInterval(id); };
  }, [sessionId]);

  const rawFileUrl = useMemo(() => {
    if (!details) return '';
    let path = details.filePath;
    if (/^https\/\//i.test(path)) path = path.replace(/^https\/\//i, 'https://');
    if (/^http\/\//i.test(path)) path = path.replace(/^http\/\//i, 'http://');
    return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path}`;
  }, [details]);
  const fileUrl = useMemo(() => {
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
  const pageUrl = useMemo(() => {
    if (!details) return '';
    const page = Math.max(1, details.currentSlide || 1);
    const cacheBust = `r=${page}`;
    return `${fileUrl}?${cacheBust}#page=${page}&zoom=page-fit&toolbar=0`;
  }, [details, fileUrl]);


  const isPdf = !!details && /pdf/i.test(details.mimeType);
  const isPpt = !!details && (/(powerpoint|\.pptx?$)/i.test(details.mimeType) || /\.pptx?$/i.test(details.filePath));
  const officeEmbedUrl = isPpt ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : '';

  // Client-side PPTX render (run unconditionally; guard inside)
  useEffect(() => {
    if (!details || !pptContainerRef.current) return;
    if (!isPpt || details.officeMode) return;
    let cancelled = false;
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
    function ensureCss(href: string) {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      if (!links.some((l) => l.href === href)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    }
    async function ensureDeps() {
      ensureCss('https://cdn.jsdelivr.net/npm/reveal.js@4.6.1/dist/reveal.css');
      ensureCss('https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@3.8.0/css/pptxjs.css');
      if (!(window as unknown as { jQuery?: unknown }).jQuery) await loadScript('https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js');
      if (!(window as unknown as { JSZip?: unknown }).JSZip) await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
      if (!(window as unknown as { Reveal?: unknown }).Reveal) await loadScript('https://cdn.jsdelivr.net/npm/reveal.js@4.6.1/dist/reveal.js');
      const w = window as unknown as { $?: { fn?: { pptxToHtml?: unknown } } };
      const hasPlugin = w?.$?.fn?.pptxToHtml;
      if (!hasPlugin) {
        await loadScript('https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@3.8.0/js/pptxjs.min.js');
        await loadScript('https://cdn.jsdelivr.net/gh/meshesha/PPTXjs@3.8.0/js/divs2slides.min.js');
      }
    }
    async function render() {
      await ensureDeps();
      if (cancelled) return;
      const container = pptContainerRef.current!;
      container.innerHTML = '';
      const host = document.createElement('div');
      container.appendChild(host);
      type JQueryInstance = { pptxToHtml: (opts: Record<string, unknown>) => void };
      type JQueryFactory = (el: HTMLElement) => JQueryInstance;
      const wjq = window as unknown as { jQuery?: JQueryFactory };
      const jqFactory: JQueryFactory | undefined = wjq.jQuery;
      if (!jqFactory) return;
      jqFactory(host).pptxToHtml({
        pptxFileUrl: fileUrl,
        slideMode: true,
        slidesScale: '100%',
        keyBoardShortCut: false,
        mediaProcess: true,
        slideType: 'revealjs',
        revealjsConfig: { controls: false, progress: true }
      });
    }
    render();
    return () => { cancelled = true; };
  }, [details, isPpt, fileUrl]);

  if (loading) return <div className="min-h-dvh grid place-items-center p-6 text-slate-600">Loading…</div>;
  if (error || !details) return <div className="min-h-dvh grid place-items-center p-6 text-rose-700">{error || 'Not found'}</div>;

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.back()}>Back</Button>
        <div className="text-lg font-semibold truncate">{details.title}</div>
        <div className="ml-auto text-sm text-slate-600">Slide {Math.max(1, details.currentSlide)}{details.totalSlides ? ` / ${details.totalSlides}` : ''}</div>
      </div>
      <div className="flex-1 min-h-0">
        {isPdf ? (
          <div className="relative w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] bg-black">
            {debug && (<div className="absolute top-2 left-2 z-50 max-w-[60vw] bg-black/70 text-green-300 text-xs p-2 rounded whitespace-pre-wrap">{debug}</div>)}
            <iframe title="slides" src={pageUrl} className="absolute inset-0 w-full h-full border-0 overflow-hidden" />
          </div>
        ) : (isPpt && details.officeMode) ? (
          <iframe title="slides" src={officeEmbedUrl} className="w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)] border-0" />
        ) : isPpt ? (
          <div className="relative w-full h-[calc(100dvh-64px)] sm:h-[calc(100dvh-72px)]">
            {debug && (<div className="absolute top-2 left-2 z-50 max-w-[60vw] bg-black/70 text-green-300 text-xs p-2 rounded whitespace-pre-wrap">{debug}</div>)}
            <div ref={pptContainerRef} className="absolute inset-0 overflow-hidden" />
          </div>
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


