"use client";
import { useEffect, useRef } from 'react';

import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@clerk/nextjs';

type Word = { word: string; count: number };
// removed unused Session type

export default function WordCloudLivePage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;
  const { isLoaded, isSignedIn } = useAuth();
  const authReady = isLoaded && isSignedIn;

  // Convex hooks
  const session = useQuery(
    api.functions.wordcloud.getActiveSession,
    authReady ? { sessionId: params.sessionId as Id<'wordCloudSessions'> } : "skip"
  );
  const section = useQuery(api.functions.sections.get, session?.sectionId ? { id: session.sectionId as Id<'sections'> } : "skip");
  const answers = useQuery(
    api.functions.wordcloud.getAnswers,
    authReady ? { sessionId: params.sessionId as Id<'wordCloudSessions'> } : "skip"
  );
  const heartbeat = useMutation(api.functions.wordcloud.heartbeat);
  const closeSession = useMutation(api.functions.wordcloud.closeSession);

  // Extract words from Convex data and aggregate counts
  const words = (() => {
    const arr = (answers as unknown as Array<{ text?: string }> | undefined) || [];
    const map = new Map<string, number>();
    for (const a of arr) {
      const t = String(a?.text || '').trim();
      if (!t) continue;
      map.set(t, (map.get(t) || 0) + 1);
    }
    return Array.from(map.entries()).map(([word, count]) => ({ word, count }));
  })();

  // Heartbeat to keep session active (10s), paused when tab hidden
  useEffect(() => {
    if (!authReady) return;
    let intervalId: number | null = null;
    const start = () => {
      if (intervalId !== null) return;
      // send one immediately when visible
      try { void heartbeat({ sessionId: sessionId as Id<'wordCloudSessions'> }); } catch { /* ignore */ }
      intervalId = window.setInterval(() => {
        try { void heartbeat({ sessionId: sessionId as Id<'wordCloudSessions'> }); } catch { /* ignore */ }
      }, 10000);
    };
    const stop = () => { if (intervalId !== null) { window.clearInterval(intervalId); intervalId = null; } };
    const onVis = () => { if (document.visibilityState === 'visible') start(); else stop(); };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [sessionId, heartbeat, authReady]);

  const maxCount = Math.max(1, ...words.map((w: Word) => w.count));

  // Real-time physics simulation with per-word DOM refs for measuring size and applying positions imperatively
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const palette = ['#2563eb', '#16a34a', '#db2777', '#f59e0b', '#0ea5e9', '#8b5cf6'];
  const nodes = useRef<Record<string, { x: number; y: number; vx: number; vy: number; w: number; h: number; color: string; scale: number; targetScale: number; count: number }>>({});
  const globalScaleRef = useRef<number>(1);
  const rafId = useRef<number | null>(null);
  const containerSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Ensure nodes exist for words; remove stale nodes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    containerSize.current = { w: rect.width, h: rect.height };
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const map = nodes.current;
    // dynamic global scale: shrink when many words
    const nWords = words.length;
    const shrink = nWords <= 20 ? 1 : Math.max(0.5, 1 - (nWords - 20) * 0.015);
    globalScaleRef.current = shrink;
    const maxCountLocal = Math.max(1, ...words.map((w: Word) => w.count));
    // Add new words at center with tiny random push
    for (const w of words) {
      if (!map[w.word]) {
        // Choose a color that avoids duplicates where possible
        const used = new Set(Object.values(map).map((n) => n.color));
        const choices = palette.filter((c) => !used.has(c));
        const color = (choices.length ? choices : palette)[Math.floor(Math.random() * (choices.length ? choices.length : palette.length))];
        const ratio = w.count / maxCountLocal;
        const base = 0.8;
        const amp = 1.8;
        const target = shrink * (base + ratio * amp);
        // random initial impulse (polar) to avoid vertical-only separation
        const theta = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 80; // px/s
        map[w.word] = {
          x: cx + (Math.random() - 0.5) * 6,
          y: cy + (Math.random() - 0.5) * 6,
          vx: Math.cos(theta) * speed,
          vy: Math.sin(theta) * speed,
          w: 40,
          h: 20,
          color,
          scale: Math.max(0.6, target * 0.7),
          targetScale: target,
          count: w.count,
        };
      }
    }
    // Remove nodes for words that no longer exist
    for (const key of Object.keys(map)) {
      if (!words.find((w: Word) => w.word === key)) delete map[key];
    }
    // Update target scales for existing nodes when counts change
    for (const w of words) {
      const n = map[w.word];
      if (!n) continue;
      const ratio = w.count / maxCountLocal;
      const base = 0.8;
      const amp = 1.8;
      const computed = shrink * (base + ratio * amp);
      // If this word's count increased, ensure a visible bump above current scale
      if (w.count > n.count) {
        n.targetScale = Math.max(computed, n.scale + 0.12);
      } else {
        n.targetScale = computed;
      }
      n.count = w.count;
    }
  }, [words]);

  // Measure word sizes when DOM updates
  useEffect(() => {
    for (const w of words) {
      const el = nodeRefs.current[w.word];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const n = nodes.current[w.word];
      if (n) {
        n.w = rect.width;
        n.h = rect.height;
      }
    }
  });

  // Resize observer to keep bounds updated
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) containerSize.current = { w: r.width, h: r.height };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Physics loop
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const run = () => {
      const map = nodes.current;
      const { w: W, h: H } = containerSize.current;
      const cx = W / 2;
      const cy = H / 2;
      const wordsList = words.map((w: Word) => w.word);
      const dt = 0.016;
      const baseK = 0.08;
      const centerK = baseK + 0.06 * Math.min(1, wordsList.length / 20);
      const wallMargin = 48;
      const wallK = 0.002;
      const spacing = 6; // extra padding between words

      // Integrate forces
      for (let i = 0; i < wordsList.length; i++) {
        const aKey = wordsList[i];
        const a = map[aKey];
        if (!a) continue;
        // Spring toward center + mild gravity-like pull
        const dxC = cx - a.x;
        const dyC = cy - a.y;
        const distC2 = Math.max(25, dxC * dxC + dyC * dyC);
        const grav = 36 / distC2;
        a.vx += dxC * centerK * dt + dxC * grav * dt;
        a.vy += dyC * centerK * dt + dyC * grav * dt;
        // Radial outward velocity damping to curb edge drift
        const invLen = 1 / Math.sqrt(distC2);
        const uxC = dxC * invLen;
        const uyC = dyC * invLen;
        const radialVel = -(a.vx * uxC + a.vy * uyC); // positive if moving outward
        if (radialVel > 0) {
          const damp = Math.min(0.25, 0.08 + 0.02 * Math.min(1, wordsList.length / 20));
          // Reduce outward radial component by adding back along +uxC (toward center)
          a.vx += radialVel * uxC * damp;
          a.vy += radialVel * uyC * damp;
        }
        // Outer ring containment: pull back if past 40% of min dimension
        const R = 0.4 * Math.min(W, H);
        const r = Math.sqrt(distC2);
        if (r > R) {
          const ringK = 0.0015 * (1 + Math.min(1, wordsList.length / 30));
          const over = r - R;
          a.vx += (dxC * invLen) * (over * ringK);
          a.vy += (dyC * invLen) * (over * ringK);
        }
        // Soft wall push to avoid border pile-up
        if (a.x < wallMargin) a.vx += (wallMargin - a.x) * wallK;
        if (a.x > W - wallMargin) a.vx -= (a.x - (W - wallMargin)) * wallK;
        if (a.y < wallMargin) a.vy += (wallMargin - a.y) * wallK;
        if (a.y > H - wallMargin) a.vy -= (a.y - (H - wallMargin)) * wallK;
        // Edge repellers: approximate with line forces from each edge
        const rx = Math.max(20, (a.w * 0.5));
        const ry = Math.max(12, (a.h * 0.5));
        const dl = Math.max(1, (a.x - rx));
        const dr = Math.max(1, (W - rx - a.x));
        const dtp = Math.max(1, (a.y - ry));
        const db = Math.max(1, (H - ry - a.y));
        const edgeK = 7000;
        a.vx += (1 / (dl * dl)) * edgeK * dt; // push right from left edge
        a.vx -= (1 / (dr * dr)) * edgeK * dt; // push left from right edge
        a.vy += (1 / (dtp * dtp)) * edgeK * dt; // push down from top
        a.vy -= (1 / (db * db)) * edgeK * dt; // push up from bottom
      }
      // Pairwise repulsion with soft collision based on measured size
      for (let i = 0; i < wordsList.length; i++) {
        const ai = wordsList[i];
        const A = map[ai];
        if (!A) continue;
        for (let j = i + 1; j < wordsList.length; j++) {
          const bj = wordsList[j];
          const B = map[bj];
          if (!B) continue;
          const dx = A.x - B.x;
          const dy = A.y - B.y;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          // AABB overlap with padding
          const rxA = (A.w * 0.5) + spacing;
          const ryA = (A.h * 0.5) + spacing;
          const rxB = (B.w * 0.5) + spacing;
          const ryB = (B.h * 0.5) + spacing;
          const overlapX = rxA + rxB - absDx;
          const overlapY = ryA + ryB - absDy;
          if (overlapX > 0 && overlapY > 0) {
            // Resolve along the axis of least overlap (minimal translation vector)
            if (overlapX < overlapY) {
              const push = 0.6 * overlapX + 0.5;
              const s = dx >= 0 ? 1 : -1;
              A.x += s * (push * 0.5);
              B.x -= s * (push * 0.5);
              A.vx += s * push * 0.1;
              B.vx -= s * push * 0.1;
            } else {
              const push = 0.6 * overlapY + 0.5;
              const s = dy >= 0 ? 1 : -1;
              A.y += s * (push * 0.5);
              B.y -= s * (push * 0.5);
              A.vy += s * push * 0.1;
              B.vy -= s * push * 0.1;
            }
          } else {
            // Anisotropic repulsion using normalized distance by sizes
            const normDx = dx / Math.max(1, rxA + rxB);
            const normDy = dy / Math.max(1, ryA + ryB);
            const normDist = Math.max(0.2, Math.hypot(normDx, normDy));
            const rep = 70 / (normDist * normDist);
            const ux = normDx / normDist;
            const uy = normDy / normDist;
            const fx = ux * rep;
            const fy = uy * rep;
            A.vx += fx;
            A.vy += fy;
            B.vx -= fx;
            B.vy -= fy;
          }
        }
      }
      // Integrate velocities, apply damping and boundary bounces for bounciness
      for (const key of wordsList) {
        const n = map[key];
        if (!n) continue;
        // cap velocities for stability
        const vmax = 600;
        n.vx = Math.max(-vmax, Math.min(vmax, n.vx));
        n.vy = Math.max(-vmax, Math.min(vmax, n.vy));
        n.vx *= 0.9;
        n.vy *= 0.9;
        n.x += n.vx * dt * 1.2;
        n.y += n.vy * dt * 1.2;
        // Hard circular clamp to keep words toward center
        {
          const dx = n.x - cx;
          const dy = n.y - cy;
          const r = Math.hypot(dx, dy);
          const Rmax = 0.43 * Math.min(W, H);
          if (r > Rmax) {
            const ux = dx / r;
            const uy = dy / r;
            n.x = cx + ux * Rmax;
            n.y = cy + uy * Rmax;
            const vOut = n.vx * ux + n.vy * uy;
            if (vOut > 0) {
              n.vx -= vOut * ux;
              n.vy -= vOut * uy;
            }
          }
        }
        // Smooth scale animation towards target
        n.scale += (n.targetScale - n.scale) * 0.18;
        // Keep fully inside bounds based on measured size
        const rx = Math.max(20, (n.w * 0.5));
        const ry = Math.max(12, (n.h * 0.5));
        // Bounce on bounds with restitution
        const e = 0.7;
        if (n.x < rx) { n.x = rx; n.vx = Math.abs(n.vx) * e; }
        if (n.x > W - rx) { n.x = W - rx; n.vx = -Math.abs(n.vx) * e; }
        if (n.y < ry) { n.y = ry; n.vy = Math.abs(n.vy) * e; }
        if (n.y > H - ry) { n.y = H - ry; n.vy = -Math.abs(n.vy) * e; }
      }
      // Apply to DOM
      for (const key of wordsList) {
        const el = nodeRefs.current[key];
        const n = map[key];
        if (!el || !n) continue;
        el.style.left = `${n.x - n.w / 2}px`;
        el.style.top = `${n.y - n.h / 2}px`;
        el.style.transform = `translateZ(0) scale(${n.scale})`;
      }
      rafId.current = requestAnimationFrame(run);
    };
    rafId.current = requestAnimationFrame(run);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [words]);

  return (
    <div className="relative min-h-dvh px-4 py-6">
      {/* Subtle animated gradient background like Attendance */}
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
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            className="inline-flex items-center gap-2 bg-white/80 hover:bg-white text-slate-900 border border-slate-200 rounded-xl px-3 py-2"
            onClick={async () => {
              try {
                await closeSession({ sessionId: params.sessionId as Id<'wordCloudSessions'> });
              } catch { /* ignore */ }
              history.back();
            }}
          >
            ← Back
          </button>
          <div className="flex-1 text-center">
            {section?.title && (
              <div className="text-sm text-slate-700 truncate mb-1">{section.title}</div>
            )}
            {session ? (
              <div className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-800">{session.prompt}</div>
            ) : (
              <div className="text-slate-400">Loading…</div>
            )}
          </div>
          <div className="w-[64px]" />
        </div>
        <div ref={containerRef} className="relative w-full min-h-[70vh]">
          {words.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-slate-400">Waiting for answers…</div>
          )}
          {words.map((w: Word) => {
            const scale = 0.9 + (w.count / maxCount) * 1.8;
            return (
              <span
                key={w.word}
                ref={(el) => { nodeRefs.current[w.word] = el; }}
                className="absolute font-bold select-none will-change-transform"
                style={{
                  transform: `translateZ(0) scale(${scale})`,
                  color: (nodes.current[w.word]?.color ?? '#2563eb'),
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

