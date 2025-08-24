"use client";
import { useEffect, useState } from 'react';
import { Card, Button } from '@snaproll/ui';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@snaproll/api-client';

type PollSession = { id: string; prompt: string; options: string[]; showResults: boolean };

export default function PollLivePage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const [session, setSession] = useState<PollSession | null>(null);
  const [toggling, setToggling] = useState(false);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const s = await apiFetch<PollSession>(`/api/poll/${sessionId}`);
        if (mounted) setSession(s);
      } catch {
        /* ignore */
      }
    }
    load();
    const id = window.setInterval(load, 1500);
    return () => { mounted = false; window.clearInterval(id); };
  }, [sessionId]);

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
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-2xl font-semibold text-center">{session?.prompt ?? 'Loading…'}</div>
        <Card className="p-4">
          <div className="space-y-2">
            {(session?.options ?? []).map((opt, i) => {
              const count = counts ? counts[i] : 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={i} className="border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div>{opt}</div>
                    {session?.showResults ? <div className="text-slate-500 text-sm">{count} ({pct}%)</div> : null}
                  </div>
                  {session?.showResults ? (
                    <div className="h-2 w-full bg-slate-200 rounded">
                      <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end mt-4">
            <Button disabled={toggling} onClick={async () => {
              try {
                setToggling(true);
                await apiFetch(`/api/poll/${sessionId}/toggle-results`, { method: 'POST' });
              } finally { setToggling(false); }
            }}>{session?.showResults ? 'Hide Results' : 'Show Results'}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}


