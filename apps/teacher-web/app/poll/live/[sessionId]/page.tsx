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
  const session = useQuery(api.polls.getActivePoll, { sessionId });
  const results = useQuery(api.polls.getResults, { sessionId });
  const toggleResults = useMutation(api.polls.toggleResults);
  const closePoll = useMutation(api.polls.closePoll);
  const heartbeat = useMutation(api.polls.heartbeat);

  // Update showLocal when session data loads
  useEffect(() => {
    if (session && showLocal === null) {
      setShowLocal(session.showResults);
    }
  }, [session, showLocal]);

  // Heartbeat
  useEffect(() => {
    const id = window.setInterval(() => { 
      void heartbeat({ sessionId }); 
    }, 5000);
    return () => window.clearInterval(id);
  }, [sessionId, heartbeat]);

  return (
    <div className="min-h-dvh px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-2"
            onClick={async () => { try { await closePoll({ sessionId }); } catch {/* ignore */} history.back(); }}
          >
            ← Back
          </button>
          <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-800 text-center flex-1">
            {session?.prompt ?? 'Loading…'}
          </div>
          <div className="w-[120px]" />
        </div>
        <div className="grid place-items-center">
          <Card className="p-6 w-full max-w-3xl">
          <div className="space-y-3">
            {(session?.options ?? []).map((opt, i) => {
              const count = results ? results.counts[i] : 0;
              const pct = results && results.total > 0 ? Math.round((count / results.total) * 100) : 0;
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
            <div className="text-slate-500">{results?.total || 0} {(results?.total || 0) === 1 ? 'response' : 'responses'}</div>
            <Button disabled={toggling} onClick={async () => {
              // Instant UI toggle
              setShowLocal((prev) => !(prev ?? session?.showResults));
              // Fire-and-forget server toggle
              setToggling(true);
              toggleResults({ sessionId })
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


