"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@flamelink/ui';
import { HiOutlinePencilSquare } from 'react-icons/hi2';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import BiblePassageStartModal from '../../../dashboard/_components/BiblePassageStartModal';
import { useDemoUser } from '../../../_components/DemoUserContext';

function toChapterReference(reference: string): string {
  const ref = reference.trim();
  const idx = ref.indexOf(':');
  if (idx === -1) return ref;
  return ref.slice(0, idx);
}

function buildExternalUrl(reference: string, translationId: string | undefined) {
  const base = 'https://www.biblegateway.com/passage/';
  const params = new URLSearchParams();
  params.set('search', toChapterReference(reference));
  const version = translationId?.toLowerCase() === 'kjv' ? 'KJV' : 'WEB';
  params.set('version', version);
  return `${base}?${params.toString()}`;
}

export default function BibleLivePage({ params }: { params: { sessionId: string } }) {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <BibleLivePageDemo params={params} /> : <BibleLivePageWorkOS params={params} />;
}

function BibleLivePageDemo({ params }: { params: { sessionId: string } }) {
  const { demoUserEmail } = useDemoUser();
  return <BibleLivePageCore params={params} authReady={true} demoUserEmail={demoUserEmail} />;
}

function BibleLivePageWorkOS({ params }: { params: { sessionId: string } }) {
  const { user, loading } = useAuth();
  const authReady = !loading && !!user;
  return <BibleLivePageCore params={params} authReady={authReady} />;
}

function BibleLivePageCore({ params, authReady, demoUserEmail }: { params: { sessionId: string }; authReady: boolean; demoUserEmail?: string }) {
  const { sessionId } = params;
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  const demoArgs = useMemo(
    () => (isDemoMode && demoUserEmail ? { demoUserEmail } : {}),
    [isDemoMode, demoUserEmail]
  );

  const session = useQuery(
    api.functions.bible.getBibleSession,
    authReady ? { sessionId: sessionId as Id<'biblePassageSessions'>, ...demoArgs } : 'skip'
  ) as
    | {
        _id: Id<'biblePassageSessions'>;
        sectionId: Id<'sections'>;
        reference: string;
        translationId: string;
        translationName: string;
        text: string;
      }
    | null
    | undefined;

  const section = useQuery(
    api.functions.sections.get,
    session?.sectionId ? { id: session.sectionId as Id<'sections'>, ...demoArgs } : 'skip'
  ) as { title?: string; gradient?: string } | null | undefined;

  const heartbeat = useMutation(api.functions.bible.heartbeat);
  const close = useMutation(api.functions.bible.closeBiblePassage);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let id: number | null = null;
    const start = () => {
      if (id !== null) return;
      try {
        void heartbeat({ sessionId: sessionId as Id<'biblePassageSessions'>, ...demoArgs });
      } catch {
        // ignore
      }
      id = window.setInterval(() => {
        try {
          void heartbeat({ sessionId: sessionId as Id<'biblePassageSessions'>, ...demoArgs });
        } catch {
          // ignore
        }
      }, 10000);
    };
    const stop = () => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [sessionId, heartbeat, authReady, demoUserEmail, isDemoMode]);

  if (!session) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <Card className="p-6 max-w-md w-full text-center">
          <div className="font-medium mb-1">Bible Passage</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            This session is no longer active.
          </div>
        </Card>
      </div>
    );
  }

  const backgroundGradient = section?.gradient || 'gradient-1';
  const fullRef = `${session.reference} (${session.translationName})`;
  const externalUrl = buildExternalUrl(session.reference, session.translationId);

  let verses: Array<{ verse?: number | string; text?: string }> | null = null;
  if (typeof (session as any).versesJson === 'string') {
    try {
      const parsed = JSON.parse((session as any).versesJson as string) as Array<{
        verse?: number | string;
        text?: string;
      }>;
      verses = parsed;
    } catch {
      verses = null;
    }
  }

  const paragraphs = !verses
    ? session.text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="relative min-h-dvh px-4 py-6">
      <div
        className={`pointer-events-none fixed inset-0 ${backgroundGradient}`}
        style={{ opacity: 0.3 }}
      />
      <div className="pointer-events-none fixed inset-0 bg-white/35 dark:bg-neutral-950/60" />
      <div
        className="pointer-events-none fixed -inset-[20%] opacity-30 animate-[gradient_drift_14s_linear_infinite]"
        style={{
          background:
            'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.32), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.32), transparent)',
        }}
      />
      <style jsx>{`
        @keyframes gradient_drift {
          0% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(2%, -2%, 0) scale(1.02);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
      <div className="relative z-10 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            className="inline-flex items-center gap-2 bg-white/80 hover:bg-white text-neutral-900 border border-neutral-200 rounded-xl px-3 py-2 dark:bg-neutral-900/80 dark:hover:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700"
            onClick={async () => {
              try {
                await close({ sessionId: session._id, ...demoArgs });
              } catch {
                // ignore
              }
              history.back();
            }}
          >
            ← Back
          </button>
          <div className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex flex-col items-center gap-1 px-3 py-1 rounded-lg hover:bg-white/70 dark:hover:bg-neutral-900/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 group"
              aria-label="Edit Bible passage"
            >
              {section?.title && (
                <div className="text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-xs">
                  {section.title}
                </div>
              )}
              <div className="inline-flex items-center justify-center gap-2">
                <span className="text-2xl sm:text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-50">
                  {session.reference}
                </span>
                <HiOutlinePencilSquare className="h-5 w-5 text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
              </div>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {session.translationName}
              </div>
            </button>
          </div>
          <div className="w-[112px]" />
        </div>
        <Card className="p-6 bg-white/90 dark:bg-neutral-950/90 border border-neutral-200/70 dark:border-neutral-800 shadow-soft">
          <div className="space-y-4 text-neutral-900 dark:text-neutral-100 leading-relaxed text-lg">
            {verses && verses.length > 0 ? (
              verses.map((v, idx) => (
                <p key={`${v.verse ?? idx}`} className="whitespace-pre-wrap">
                  {typeof v.verse !== 'undefined' && (
                    <sup className="align-super text-xs text-neutral-500 mr-1">
                      {String(v.verse)}
                    </sup>
                  )}
                  {(v.text || '').trim()}
                </p>
              ))
            ) : paragraphs.length === 0 ? (
              <p className="whitespace-pre-wrap">{session.text}</p>
            ) : (
              paragraphs.map((p, idx) => (
                <p key={idx} className="whitespace-pre-wrap">
                  {p}
                </p>
              ))
            )}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-neutral-500 dark:text-neutral-400">
            <div>{fullRef}</div>
            <button
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
            >
              View full passage on Bible Gateway →
            </button>
          </div>
        </Card>
      </div>

      <BiblePassageStartModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        sectionId={session.sectionId}
        sessionId={session._id}
        initialReference={session.reference}
        initialTranslationId={session.translationId}
        demoUserEmail={demoUserEmail}
      />
    </div>
  );
}
