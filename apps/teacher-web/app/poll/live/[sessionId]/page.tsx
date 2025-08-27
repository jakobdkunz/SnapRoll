"use client";
import { useEffect, useState } from 'react';
import { Card, Button } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { convex } from '@snaproll/convex-client';

type PollSession = { id: string; prompt: string; options: string[]; showResults: boolean };

export default function PollLivePage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const [toggling, setToggling] = useState(false);
  const [showLocal, setShowLocal] = useState<boolean | null>(true);

  // Convex hooks
  // Using session details from getResults response; for header we can reuse prompt if available
  // sessionId here is the poll session; getActivePoll expects sectionId. We'll derive header from results.
  const session = null as any;
  const results = useQuery(api.functions.polls.getResults, { sessionId: params.sessionId as any });
  const toggleResults = useMutation(api.functions.polls.toggleResults);
  const closePoll = useMutation(api.functions.polls.closePoll);
  const heartbeat = useMutation(api.functions.polls.heartbeat);

  // Update showLocal when session data loads
  useEffect(() => {
    if (session && showLocal === null) {
      setShowLocal(session.showResults);
    }
  }, [session, showLocal]);

  // Heartbeat
  useEffect(() => {
    const id = window.setInterval(() => { 
      void heartbeat({ sessionId: params.sessionId as any }); 
    }, 5000);
    return () => window.clearInterval(id);
  }, [sessionId, heartbeat]);

  return (
    <div className="min-h-dvh px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-2"
            onClick={async () => { try { await closePoll({ sessionId: params.sessionId as any }); } catch {/* ignore */} history.back(); }}
          >
            ← Back
          </button>
          <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-800 text-center flex-1">
            {(results as any)?.session?.prompt ?? 'Loading…'}
          </div>
          <div className="w-[120px]" />
        </div>
        <div className="grid place-items-center">
          <Card className="p-6 w-full max-w-3xl">
          <div className="space-y-3">
            {(session ? JSON.parse((session as any).optionsJson || '[]') : []).map((opt: any, i: number) => {
              const count = results ? (results as any).results?.[i]?.count || 0 : 0;
              const total = results ? (results as any).totalAnswers || 0 : 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={i} className="relative overflow-hidden rounded-xl border bg-slate-50">
                  {(showLocal ?? session?.showResults) ? (
                    <div className="absolute inset-y-0 left-0 bg-blue-500/80 transition-all duration-500" style={{ width: `${pct}%` }} />
                  ) : (
                                          <div className="absolute inset-y-0 left-0 bg-blue-500/80 transition-all duration-500" style={{ width: `0%` }} />
                  )}
                  <div className="relative z-10 flex items-center justify-between px-4 py-3 text-lg">
                    <div className="font-medium">{opt}</div>
                    {(showLocal ?? session?.showResults) ? <div className="text-slate-800 font-semibold">{count} ({pct}%)</div> : null}
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


