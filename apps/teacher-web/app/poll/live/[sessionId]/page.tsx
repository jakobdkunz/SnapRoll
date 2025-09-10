"use client";
import { useEffect, useState } from 'react';
import { Card, Button } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@clerk/nextjs';

type PollSession = { id: string; prompt: string; options: string[]; showResults: boolean };

export default function PollLivePage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const [toggling, setToggling] = useState(false);
  const [showLocal, setShowLocal] = useState<boolean | null>(null);
  const { isLoaded, isSignedIn } = useAuth();
  const authReady = isLoaded && isSignedIn;

  // Convex hooks
  // Using session details from getResults response; for header we can reuse prompt if available
  // sessionId here is the poll session; getActivePoll expects sectionId. We'll derive header from results.
  const session = null as any;
  const results = useQuery(
    api.functions.polls.getResults,
    authReady ? { sessionId: params.sessionId as any } : "skip"
  );
  const sectionId = (results as any)?.session?.sectionId;
  const section = useQuery(api.functions.sections.get, sectionId ? { id: sectionId as any } : "skip");
  const toggleResults = useMutation(api.functions.polls.toggleResults);
  const closePoll = useMutation(api.functions.polls.closePoll);
  const heartbeat = useMutation(api.functions.polls.heartbeat);

  // Update showLocal when results load
  useEffect(() => {
    const sr = (results as any)?.session;
    if (sr && showLocal === null) setShowLocal(!!sr.showResults);
  }, [results, showLocal]);

  // Heartbeat (10s), paused while tab hidden; immediate on visible
  useEffect(() => {
    if (!authReady) return;
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
  }, [sessionId, heartbeat, authReady]);

  return (
    <div className="relative min-h-dvh px-4 py-6">
      {/* Background like Attendance */}
      <div className={`pointer-events-none fixed inset-0 ${section?.gradient || 'gradient-1'}`} style={{ opacity: 0.3 }} />
      <div className="pointer-events-none fixed inset-0 bg-white/35" />
      <div className="pointer-events-none fixed -inset-[20%] opacity-30 animate-[gradient_drift_14s_linear_infinite]" style={{ background: 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.32), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.32), transparent)' }} />
      <style jsx>{`
        @keyframes gradient_drift {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(2%, -2%, 0) scale(1.02); }
          100% { transform: translate3d(0,0,0); }
        }
      `}</style>
      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            className="inline-flex items-center gap-2 bg-white/80 hover:bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-2"
            onClick={async () => { try { await closePoll({ sessionId: params.sessionId as any }); } catch {/* ignore */} history.back(); }}
          >
            ← Back
          </button>
          <div className="flex-1 text-center">
            {section?.title && (
              <div className="text-sm text-slate-700 truncate mb-1">{section.title}</div>
            )}
            <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-800">
              {(results as any)?.session?.prompt ?? 'Loading…'}
            </div>
          </div>
          <div className="w-[120px]" />
        </div>
        <div className="grid place-items-center">
          <Card className="p-6 w-full max-w-3xl">
          <div className="space-y-3">
            {(() => {
              try {
                return JSON.parse(((results as any)?.session?.optionsJson) || '[]');
              } catch { return []; }
            })().map((opt: any, i: number) => {
              const count = results ? (results as any).results?.[i]?.count || 0 : 0;
              const total = results ? (results as any).totalAnswers || 0 : 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={i} className="relative overflow-hidden rounded-xl border bg-slate-50">
                  {(showLocal ?? (results as any)?.session?.showResults) ? (
                    <div className="absolute inset-y-0 left-0 bg-blue-500/80 transition-all duration-500" style={{ width: `${pct}%` }} />
                  ) : (
                                          <div className="absolute inset-y-0 left-0 bg-blue-500/80 transition-all duration-500" style={{ width: `0%` }} />
                  )}
                  <div className="relative z-10 flex items-center justify-between px-4 py-3 text-lg">
                    <div className="font-medium">{opt}</div>
                    {(showLocal ?? (results as any)?.session?.showResults) ? <div className="text-slate-800 font-semibold">{count} ({pct}%)</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-5">
            <div className="text-slate-500">{(results as any)?.totalAnswers || 0} {((results as any)?.totalAnswers || 0) === 1 ? 'response' : 'responses'}</div>
            <Button disabled={toggling} onClick={async () => {
              // Instant UI toggle
              setShowLocal((prev) => !(prev ?? session?.showResults));
              // Fire-and-forget server toggle
              setToggling(true);
              toggleResults({ sessionId: params.sessionId as any })
                .catch(() => { /* ignore */ })
                .finally(() => setToggling(false));
            }}>{(showLocal ?? session?.showResults) ? 'Hide Results' : 'Show Results'}</Button>
          </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


