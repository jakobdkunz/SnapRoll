"use client";
import { useEffect, useState } from 'react';
import { Card, Button } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type PollSession = { id: string; prompt: string; options: string[]; showResults: boolean };

export default function PollLivePage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const [session, setSession] = useState<PollSession | null>(null);
  const [toggling, setToggling] = useState(false);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [total, setTotal] = useState(0);
  const [showLocal, setShowLocal] = useState<boolean | null>(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const s = await apiFetch<PollSession>(`/api/poll/${sessionId}`);
        if (mounted) {
          setSession(s);
          if (showLocal === null) setShowLocal(s.showResults);
        }
      } catch {
        /* ignore */
      }
    }
    load();
    const id = window.setInterval(load, 1500);
    return () => { mounted = false; window.clearInterval(id); };
  }, [sessionId, showLocal]);

  // Heartbeat
  useEffect(() => {
    const id = window.setInterval(() => { void apiFetch(`/api/poll/${sessionId}/heartbeat`, { method: 'POST' }); }, 5000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  // Results polling
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await apiFetch<{ counts: number[]; total: number }>(`/api/poll/${sessionId}/results`);
        if (mounted) { setCounts(r.counts); setTotal(r.total); }
      } catch { /* ignore */ }
    }
    load();
    const id = window.setInterval(load, 1500);
    return () => { mounted = false; window.clearInterval(id); };
  }, [sessionId]);

  return (
    <div className="min-h-dvh px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-2"
            onClick={async () => { try { await apiFetch(`/api/poll/${sessionId}/close`, { method: 'POST' }); } catch {/* ignore */} history.back(); }}
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
              const count = counts ? counts[i] : 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={i} className="relative overflow-hidden rounded-xl border bg-slate-50">
                  {(showLocal ?? session?.showResults) ? (
                    <div className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-500" style={{ width: `${pct}%` }} />
                  ) : (
                    <div className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-500" style={{ width: `0%` }} />
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
            <div className="text-slate-500">{total} {total === 1 ? 'response' : 'responses'}</div>
            <Button disabled={toggling} onClick={async () => {
              // Instant UI toggle
              setShowLocal((prev) => !(prev ?? session?.showResults));
              // Fire-and-forget server toggle
              setToggling(true);
              apiFetch(`/api/poll/${sessionId}/toggle-results`, { method: 'POST' })
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


