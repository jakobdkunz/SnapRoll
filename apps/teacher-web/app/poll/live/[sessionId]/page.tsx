"use client";
import { useEffect, useState } from 'react';
import { Card, Button } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type PollSession = { id: string; prompt: string; options: string[]; showResults: boolean };

export default function PollLivePage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params;
  const [session, setSession] = useState<PollSession | null>(null);
  const [toggling, setToggling] = useState(false);

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

  return (
    <div className="min-h-dvh px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-2xl font-semibold text-center">{session?.prompt ?? 'Loading…'}</div>
        <Card className="p-4">
          <div className="space-y-2">
            {(session?.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>{opt}</div>
                {session?.showResults ? <div className="text-slate-500 text-sm">…</div> : null}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button disabled={toggling} onClick={async () => {
              try {
                setToggling(true);
                await apiFetch(`/api/poll/${sessionId}/toggle-results`, { method: 'POST' });
              } finally { setToggling(false); }
            }}>{session?.showResults ? 'Hide Results' : 'Reveal Results'}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}


