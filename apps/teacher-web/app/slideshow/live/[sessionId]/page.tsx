"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@snaproll/ui';
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

// PDFs are rendered via iframe viewer

export default function SlideshowPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [working, setWorking] = useState(false);
  const [debug, setDebug] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pptContainerRef = useRef<HTMLDivElement | null>(null);

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

  const pageUrl = useMemo(() => {
    if (!details) return '';
    const page = Math.max(1, details.currentSlide || 1);
    const cacheBust = `r=${page}`;
    return `${fileUrl}?${cacheBust}#page=${page}&zoom=page-fit&toolbar=0`;
  }, [details, fileUrl]);

  // (Removed legacy JSZip fallback; using PPTX.js integration below)

  // PPTX rendering using PPTX.js + Reveal.js (instructor view)
  useEffect(() => {
    if (!details || !isPpt || details.officeMode) return;
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
      ensureCss('/vendor/reveal.css');
      ensureCss('/vendor/pptxjs.css');
      if (!(window as unknown as { jQuery?: unknown }).jQuery) await loadScript('/vendor/jquery.min.js');
      if (!(window as unknown as { JSZip?: unknown }).JSZip) await loadScript('/vendor/jszip.min.js');
      if (!(window as unknown as { Reveal?: unknown }).Reveal) await loadScript('/vendor/reveal.js');
      const w = window as unknown as { $?: { fn?: { pptxToHtml?: unknown } } };
      const hasPlugin = w?.$?.fn?.pptxToHtml;
      if (!hasPlugin) {
        await loadScript('/vendor/pptxjs.min.js');
        await loadScript('/vendor/divs2slides.min.js');
      }
    }
    async function render() {
      await ensureDeps();
      if (cancelled || !pptContainerRef.current) return;
      const host = document.createElement('div');
      pptContainerRef.current.innerHTML = '';
      pptContainerRef.current.appendChild(host);
      type JQueryInstance = { pptxToHtml: (opts: Record<string, unknown>) => void };
      type JQueryFactory = (el: HTMLElement) => JQueryInstance;
      const wjq = window as unknown as { jQuery?: JQueryFactory };
      const jqFactory: JQueryFactory | undefined = wjq.jQuery;
      if (!jqFactory) return;
      jqFactory(host).pptxToHtml({
        pptxFileUrl: fileUrl || directFileUrl,
        slideMode: true,
        slidesScale: '100%',
        keyBoardShortCut: true,
        mediaProcess: true,
        slideType: 'revealjs',
        revealjsConfig: { controls: true, progress: true },
      });
      // After mount, try to sync to current slide and wire changes
      setTimeout(() => {
        const wReveal = (window as unknown as { Reveal?: { on?: (evt: string, cb: (e: any) => void) => void; slide?: (h: number, v?: number) => void } }).Reveal;
        if (!wReveal) return;
        try {
          if (details?.currentSlide && typeof wReveal.slide === 'function') {
            wReveal.slide(Math.max(0, details.currentSlide - 1));
          }
          if (typeof wReveal.on === 'function') {
            wReveal.on('slidechanged', (e: any) => {
              const index = (e && (e.indexh ?? e.index)) ?? 0;
              const target = Number(index) + 1;
              setDetails(prev => prev ? { ...prev, currentSlide: target } : prev);
              void apiFetch(`/api/slideshow/${sessionId}/goto`, { method: 'POST', body: JSON.stringify({ slide: target }) }).catch(() => {});
            });
          }
        } catch {
          // ignore
        }
      }, 250);
    }
    render();
    return () => { cancelled = true; };
  }, [details, isPpt, directFileUrl, fileUrl, sessionId]);

  // Heartbeat to keep session alive
  useEffect(() => {
    const id = window.setInterval(() => { void apiFetch(`/api/slideshow/${sessionId}/heartbeat`, { method: 'POST' }); }, 5000);
    return () => window.clearInterval(id);
  }, [sessionId]);

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

  // PDF rendering replaced by iframe; drawing tools removed for now

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
              <Button variant="ghost" onClick={() => gotoSlide(details.currentSlide + 1)} disabled={working || (!!details.totalSlides && details.currentSlide >= details.totalSlides)}>Next</Button>
            </div>
          ) : null}
        </div>
        
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          {isPdf ? (
            <iframe title="slides" src={pageUrl} className="absolute inset-0 w-full h-full border-0 overflow-hidden" />
          ) : (isPpt && details?.officeMode) ? (
            <iframe title="slides" src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directFileUrl || fileUrl)}`} className="absolute inset-0 w-full h-full border-0 overflow-hidden" />
          ) : isPpt ? (
            <div ref={pptContainerRef} className="absolute inset-0 overflow-hidden" />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-slate-600">Unsupported file type</div>
            </div>
          )}
        </div>
        
        {/* No overlay tools for PDF in iframe mode */}
      </>
    );
  }

  async function gotoSlide(slideNumber: number) {
    if (working || !details) return;
    setWorking(true);
    try {
      await apiFetch(`/api/slideshow/${sessionId}/goto`, {
        method: 'POST',
        body: JSON.stringify({ slide: slideNumber })
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



