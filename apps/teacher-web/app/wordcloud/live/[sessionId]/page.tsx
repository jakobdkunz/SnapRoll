"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type Word = { word: string; count: number };
type Session = { id: string; prompt: string; showPromptToStudents: boolean; allowMultipleAnswers: boolean };

export default function WordCloudLivePage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const [words, setWords] = useState<Word[]>([]);
  const [session, setSession] = useState<Session | null>(null);

  // Load session meta
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch<{ session: Session }>(`/api/wordcloud/${sessionId}`);
        if (mounted) setSession(res.session);
      } catch {
        /* ignore */
      }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  // Heartbeat to keep session active
  useEffect(() => {
    const interval = window.setInterval(() => {
      void apiFetch(`/api/wordcloud/${sessionId}/heartbeat`, { method: 'POST' });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [sessionId]);

  // Poll answers
  useEffect(() => {
    let mounted = true;
    async function tick() {
      try {
        const res = await apiFetch<{ words: Word[] }>(`/api/wordcloud/${sessionId}/answers`);
        if (mounted) setWords(res.words);
      } catch {
        /* ignore transient fetch errors */
      }
    }
    tick();
    const interval = window.setInterval(tick, 1500);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [sessionId]);

  const maxCount = Math.max(1, ...words.map((w) => w.count));

  // Simple force-directed layout towards center with mild repel between words
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<Record<string, { x: number; y: number; vx: number; vy: number; color: string }>>({});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const colors = ['#2563eb', '#16a34a', '#db2777', '#f59e0b', '#0ea5e9', '#8b5cf6'];
    const next: Record<string, { x: number; y: number; vx: number; vy: number; color: string }> = { ...layout };
    for (const w of words) {
      if (!next[w.word]) {
        next[w.word] = { x: cx + (Math.random() - 0.5) * 10, y: cy + (Math.random() - 0.5) * 10, vx: 0, vy: 0, color: colors[Math.floor(Math.random() * colors.length)] };
      }
    }
    // Run a time-based simulation for a short burst to settle positions
    const dt = 0.016;
    for (let iter = 0; iter < 45; iter++) {
      for (const a of words) {
        const pa = next[a.word];
        // spring towards center
        const ax = (cx - pa.x) * 0.05;
        const ay = (cy - pa.y) * 0.05;
        pa.vx += ax * dt;
        pa.vy += ay * dt;
        for (const b of words) {
          if (a.word === b.word) continue;
          const pb = next[b.word];
          const dx = pa.x - pb.x;
          const dy = pa.y - pb.y;
          const dist2 = Math.max(1, dx * dx + dy * dy);
          const force = 1200 / dist2; // Coulomb-like repulsion
          const fx = (dx / Math.sqrt(dist2)) * force;
          const fy = (dy / Math.sqrt(dist2)) * force;
          pa.vx += fx * dt;
          pa.vy += fy * dt;
        }
        // damping
        pa.vx *= 0.92;
        pa.vy *= 0.92;
        pa.x += pa.vx;
        pa.y += pa.vy;
      }
    }
    setLayout(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length]);

  return (
    <div className="min-h-dvh px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 text-center">
          <div className="text-sm uppercase tracking-wide text-slate-500">Word Cloud</div>
          {session ? (
            <div className="text-lg font-medium text-slate-700">{session.prompt}</div>
          ) : (
            <div className="text-slate-400">Loading…</div>
          )}
        </div>
        <Card className="p-4 sm:p-6 min-h-[60vh]">
          <div ref={containerRef} className="relative w-full min-h-[50vh]">
            {words.length === 0 && (
              <div className="absolute inset-0 grid place-items-center text-slate-400">Waiting for answers…</div>
            )}
            {words.map((w) => {
              const scale = 0.9 + (w.count / maxCount) * 1.8;
              const pos = layout[w.word] || { x: 0, y: 0, vx: 0, vy: 0, color: '#2563eb' };
              return (
                <span
                  key={w.word}
                  className="absolute font-bold select-none"
                  style={{
                    left: Math.max(0, pos.x - 40),
                    top: Math.max(0, pos.y - 20),
                    transform: `scale(${scale})`,
                    transition: 'transform 300ms cubic-bezier(.34,1.56,.64,1), left 220ms ease-out, top 220ms ease-out',
                    color: pos.color,
                  }}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

