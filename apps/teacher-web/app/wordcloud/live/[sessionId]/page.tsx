"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type Word = { word: string; count: number };

export default function WordCloudLivePage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const [words, setWords] = useState<Word[]>([]);

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

  return (
    <div className="p-6">
      <Card className="p-6">
        <div className="flex flex-wrap gap-3">
          {words.map((w) => {
            const scale = 0.8 + (w.count / maxCount) * 1.6; // 0.8x to 2.4x
            return (
              <span
                key={w.word}
                className="inline-block bg-white rounded-lg shadow-soft px-3 py-2"
                style={{ transform: `scale(${scale})`, transition: 'transform 300ms cubic-bezier(.34,1.56,.64,1)' }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

