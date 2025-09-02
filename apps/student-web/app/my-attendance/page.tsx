"use client";
import { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
// import { usePathname } from 'next/navigation';
import { Card, Badge, Skeleton, Button } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useQuery } from 'convex/react';

type HistoryResponse = {
  sections: { id: string; title: string }[];
  days: { date: string }[]; // YYYY-MM-DD
  records: Array<{ sectionId: string; byDate: Record<string, { status: string; originalStatus: string; isManual: boolean; manualChange: { status: string; teacherName: string; createdAt: string | number } | null }> }>;
  totalDays: number;
  offset: number;
  limit: number;
};

function formatDateMDY(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  return `${(m).toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}/${y}`;
}

function formatHeaderDateMD(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

export default function MyAttendancePage() {
  // const pathname = usePathname();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [offset, setOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(12);
  const [isFetching] = useState<boolean>(false);
  // const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstThRef = useRef<HTMLTableCellElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // const [initialized, setInitialized] = useState(false);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; anchorX: number; anchorY: number }>({ visible: false, text: '', anchorX: 0, anchorY: 0 });

  function showTooltip(text: string, rect: DOMRect) {
    setTooltip({ visible: true, text, anchorX: rect.left + rect.width / 2, anchorY: rect.top });
  }
  function hideTooltip() {
    setTooltip(t => ({ ...t, visible: false }));
  }

  function TooltipOverlay() {
    const ref = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ left: number; top: number }>({ left: tooltip.anchorX, top: tooltip.anchorY });
    useLayoutEffect(() => {
      if (!tooltip.visible) return;
      const el = ref.current;
      if (!el) return;
      const vw = window.innerWidth;
      const margin = 8;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const left = Math.min(vw - margin - w, Math.max(margin, tooltip.anchorX - w / 2));
      let top = tooltip.anchorY - margin - h;
      if (top < margin) top = tooltip.anchorY + margin;
      setPos({ left, top });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tooltip]);
    if (!tooltip.visible) return null;
    return createPortal(
      <div
        ref={ref}
        style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999, maxWidth: 'calc(100vw - 16px)' }}
        className="pointer-events-none px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg"
      >
        {tooltip.text}
      </div>,
      document.body
    );
  }

  // Convex hooks
  const currentUser = useQuery(convexApi.auth.getCurrentUser);
  const history = useQuery(
    api.functions.history.getStudentHistory,
    currentUser?._id ? { studentId: currentUser._id as Id<"users">, offset, limit } : "skip"
  );

  // Column width calculations
  const COURSE_COL_BASE = 200; // desktop/base px width for course column
  const DAY_COL_CONTENT = isMobile ? 56 : 96; // thinner content on mobile: MM/DD vs MM/DD/YYYY
  const DAY_COL_PADDING = 12; // pl-1 (4px) + pr-2 (8px)
  // const PER_COL = DAY_COL_CONTENT + DAY_COL_PADDING; // total column footprint

  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Recompute how many day columns fit and update query limit
  const recomputeLimit = useCallback(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const containerW = containerRef.current?.clientWidth ?? Math.max(320, vw - 64);
    // Measure the actual rendered left column width including padding if possible
    const measuredLeft = firstThRef.current?.offsetWidth;
    const leftCol = measuredLeft && measuredLeft > 0 ? measuredLeft : (COURSE_COL_BASE + 20); // add fallback padding estimate
    const availableForDays = Math.max(0, containerW - leftCol);
    // Prefer summing actual header widths to determine how many fully fit
    const headerCols = Array.from(containerRef.current?.querySelectorAll<HTMLTableCellElement>('thead th:not(:first-child)') || []);
    let fit = 0;
    if (headerCols.length > 0) {
      let acc = 0;
      for (const th of headerCols) {
        const raw = th.offsetWidth || th.getBoundingClientRect().width || 0;
        let w = raw;
        if (w > 0 && w <= DAY_COL_CONTENT + 1) {
          w += DAY_COL_PADDING; // account for pl-1 pr-2 when offsetWidth is content-only
        }
        if (w <= 0) continue;
        if (acc + w <= availableForDays) {
          acc += w;
          fit += 1;
        } else {
          break;
        }
      }
    }
    if (fit <= 0) {
      // Fallback to computed footprint if headers not yet available
      const perColMeasured = containerRef.current?.querySelector<HTMLTableCellElement>('tbody tr:first-child td:not(:first-child)')?.offsetWidth;
      let perCol = perColMeasured && perColMeasured > 0 ? perColMeasured : DAY_COL_CONTENT;
      if (perCol <= DAY_COL_CONTENT) perCol += DAY_COL_PADDING;
      const epsilon = 4;
      fit = Math.max(1, Math.floor((availableForDays + epsilon) / perCol));
    }
    const capped = Math.min(60, fit);
    setLimit((prev) => (prev !== capped ? capped : prev));
  }, [COURSE_COL_BASE, DAY_COL_CONTENT, DAY_COL_PADDING]);

  useEffect(() => {
    // Recompute on mount, when viewport mode changes, and when data mounts (container size may change)
    recomputeLimit();
    if (typeof window !== 'undefined') {
      const onResize = () => recomputeLimit();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  }, [isMobile, data, recomputeLimit]);

  // Observe container size changes (not just window resizes)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      recomputeLimit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputeLimit]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update data when Convex query returns
  useEffect(() => {
    if (history) {
      setData(history as HistoryResponse);
      setLoading(false);
      setError(null);
    }
  }, [history]);

  // Update student name when student data loads
  useEffect(() => {
    if (currentUser) {
      setStudentName(`${currentUser.firstName} ${currentUser.lastName}`);
      setStudentId((currentUser._id as unknown as string) || null);
    }
  }, [currentUser]);

  // Set loading state based on Convex query
  useEffect(() => {
    if (!studentId) {
      setLoading(false);
    } else if (!history) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [studentId, history]);

  const grid = useMemo(() => {
    if (!data) return null;
    const { sections, days, records } = data;
    // Extra client-side guard: ensure unique calendar dates in header
    const seen = new Set<string>();
    const uniqueDays = days.filter((d) => {
      if (seen.has(d.date)) return false;
      seen.add(d.date);
      return true;
    });
    const recBySection = new Map(records.map((r) => [r.sectionId, r.byDate]));
    return { sections, days: uniqueDays, recBySection };
  }, [data]);

  // Always render the same skeleton on both server and client to avoid hydration mismatch
  if (!isClient || !studentId) return (
    <div className="space-y-4 p-6">
      <Card className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
  
  if (loading) return (
    <div className="space-y-4 p-6">
      <Card className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
  
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!grid || !data) return <div className="p-6">No data.</div>;

  return (
    <div className="space-y-4 p-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-600 pl-4">
            {data.totalDays > 0
              ? (() => {
                  const end = Math.min(data.totalDays, Math.max(1, data.totalDays - offset));
                  const start = Math.min(data.totalDays, Math.max(1, data.totalDays - offset - grid.days.length + 1));
                  return <>{start}–{end} of {data.totalDays} class days</>;
                })()
              : '0 of 0 class days'}
          </div>
          <div className="flex items-center gap-2">
            {/* Older page (moves window to older dates) */}
            <Button 
              variant="ghost" 
              onClick={() => { 
                const step = Math.max(1, limit);
                const maxOffset = Math.max(0, data.totalDays - step);
                const next = Math.min(maxOffset, offset + step);
                setOffset(next);
              }} 
              disabled={offset + grid.days.length >= data.totalDays}
            >
              ← <span className="hidden sm:inline">Previous</span>
            </Button>
            {/* Newer page (moves window to more recent dates) */}
            <Button 
              variant="ghost" 
              onClick={() => { 
                const step = Math.max(1, limit);
                const next = Math.max(0, offset - step); 
                setOffset(next); 
              }} 
              disabled={offset === 0}
            >
              <span className="hidden sm:inline">Next</span> →
            </Button>
          </div>
        </div>
        {/* Blank-state when no history exists, only after data has loaded */}
        {data.totalDays === 0 ? (
          <div className="py-12 grid place-items-center">
            <div className="text-center max-w-md">
              <div className="text-lg font-semibold mb-1">No attendance history yet</div>
              <div className="text-slate-600">Once you attend your first class, your history will appear here.</div>
            </div>
          </div>
        ) : (
        <div ref={containerRef} className="relative overflow-hidden">
          <table className="min-w-full border-separate border-spacing-0 table-fixed">
            <thead>
              <tr>
                <th ref={firstThRef} className="sticky left-0 z-0 bg-white pl-4 pr-1 py-2 text-left" style={{ width: COURSE_COL_BASE, minWidth: COURSE_COL_BASE, maxWidth: COURSE_COL_BASE }}>Course</th>
                {[...grid.days].reverse().map((d) => (
                  <th 
                    key={d.date} 
                    className="pl-1 pr-2 py-2 text-sm font-medium text-slate-600 text-center whitespace-nowrap sr-day-col"
                    style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
                  >
                    {isMobile ? formatHeaderDateMD(new Date(d.date)) : formatDateMDY(d.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.sections.map((s) => {
                const byDate = grid.recBySection.get(s.id)!;
                return (
                  <tr key={s.id} className="odd:bg-slate-50">
                    <td className="sticky left-0 z-0 bg-white pl-4 pr-1 py-1 text-sm" style={{ width: COURSE_COL_BASE, minWidth: COURSE_COL_BASE, maxWidth: COURSE_COL_BASE }}>
                      <div className="font-medium truncate whitespace-nowrap overflow-hidden">{s.title}</div>
                    </td>
                    {[...grid.days].reverse().map((d) => {
                      const rec = byDate[d.date] || { status: 'BLANK', originalStatus: 'BLANK', isManual: false, manualChange: null };
                      const status = rec.status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'NOT_JOINED' | 'BLANK';
                      const showManual = rec.isManual && rec.status !== rec.originalStatus;
                      const display =
                        status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'EXCUSED' ? 'E' : status === 'NOT_JOINED' ? 'NE' : '–';
                      const tooltipText = showManual && rec.manualChange
                        ? (() => {
                            const createdAt = rec.manualChange!.createdAt;
                            const dateKey = typeof createdAt === 'number' 
                              ? new Date(createdAt).toISOString().slice(0,10)
                              : (createdAt || '').slice(0,10);
                            return `Instructor manually changed the status to ${status} on ${formatDateMDY(dateKey)}`;
                          })()
                        : (() => {
                            const name = studentName || 'Student';
                            if (status === 'PRESENT') return `${name} was Present in class on ${formatDateMDY(d.date)}.`;
                            if (status === 'ABSENT') return `${name} was Absent on ${formatDateMDY(d.date)}.`;
                            if (status === 'EXCUSED') return `${name} was Excused on ${formatDateMDY(d.date)}.`;
                            if (status === 'NOT_JOINED') return `${name} was not enrolled in this course on ${formatDateMDY(d.date)}.`;
                            return '';
                          })();
                      return (
                        <td 
                          key={d.date} 
                          className="pl-1 pr-2 py-2 text-center"
                          style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
                        >
                          <div 
                            className="relative group inline-block"
                            onMouseEnter={(e) => { if (tooltipText) showTooltip(tooltipText, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
                            onMouseLeave={hideTooltip}
                            onTouchStart={(e) => { if (tooltipText) showTooltip(tooltipText, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
                            onTouchEnd={hideTooltip}
                            title={tooltipText}
                          >
                            {status === 'PRESENT' ? (
                              <Badge tone="green">{display}{showManual ? '*' : ''}</Badge>
                            ) : status === 'ABSENT' ? (
                              <Badge tone="red">{display}{showManual ? '*' : ''}</Badge>
                            ) : status === 'EXCUSED' ? (
                              <Badge tone="yellow">{display}{showManual ? '*' : ''}</Badge>
                            ) : status === 'NOT_JOINED' ? (
                              <Badge tone="gray">{display}{showManual ? '*' : ''}</Badge>
                            ) : (
                              <span className="text-slate-400">{display}{showManual ? '*' : ''}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isFetching && (
            <div className="absolute inset-0 pointer-events-none grid place-items-center">
              <div className="px-2 py-1 text-xs rounded bg-white/80 text-slate-600 border">Loading…</div>
            </div>
          )}
        </div>
        )}
        <TooltipOverlay />
      </Card>
    </div>
  );
}


