"use client";
import { useEffect, useMemo, useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
// import { usePathname } from 'next/navigation';
import { Card, Badge, Skeleton, Button } from '@flamelink/ui';
import { convexApi, api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';
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

// Unused legacy helper retained for reference was removed to avoid confusion

// Avoid timezone issues when rendering a YYYY-MM-DD date string by not using Date parsing
function formatHeaderDateMDFromString(dateStr: string) {
  const [, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
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
  // Server-side window equals the number of columns that fit
  const [limit, setLimit] = useState<number>(12);
  // Distinguish between first load and in-place refresh while navigating pages
  // const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstThRef = useRef<HTMLTableCellElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false); // based on container width
  // const [initialized, setInitialized] = useState(false);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; anchorX: number; anchorY: number }>({ visible: false, text: '', anchorX: 0, anchorY: 0 });
  const [debug, setDebug] = useState<{ container: number; leftCol: number; perCol: number; computed: number; offset: number } | null>(null);

  function showTooltip(text: string, rect: DOMRect) {
    setTooltip({ visible: true, text, anchorX: rect.left + rect.width / 2, anchorY: rect.top });
  }
  function hideTooltip() {
    setTooltip(t => ({ ...t, visible: false }));
  }

  function TooltipOverlay({ visible, text, anchorX, anchorY }: { visible: boolean; text: string; anchorX: number; anchorY: number }) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ left: number; top: number }>({ left: anchorX, top: anchorY });
    useLayoutEffect(() => {
      if (!visible) return;
      const el = ref.current;
      if (!el) return;
      const vw = window.innerWidth;
      const margin = 8;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const left = Math.min(vw - margin - w, Math.max(margin, anchorX - w / 2));
      let top = anchorY - margin - h;
      if (top < margin) top = anchorY + margin;
      setPos({ left, top });
    }, [visible, anchorX, anchorY]);
    if (!visible) return null;
    return createPortal(
      <div
        ref={ref}
        style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999, maxWidth: 'calc(100vw - 16px)' }}
        className="pointer-events-none px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg"
      >
        {text}
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
  const COURSE_COL_BASE = isCompact ? 120 : 200; // narrower when compact
  const DAY_COL_CONTENT = isCompact ? 48 : 96; // compact uses MM/DD (tighter to fit more columns)
  const DAY_COL_PADDING = 12; // pl-1 (4px) + pr-2 (8px)
  // const PER_COL = DAY_COL_CONTENT + DAY_COL_PADDING; // total column footprint
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [fillerWidth, setFillerWidth] = useState<number>(0);
  const [courseColWidth, setCourseColWidth] = useState<number>(COURSE_COL_BASE);

  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Recompute how many day columns fit using constant per-column width and set as server limit
  const recomputeVisible = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    // Measure actual container width; avoid viewport fallbacks that over-estimate
    const rectW = containerEl.getBoundingClientRect().width || containerEl.clientWidth || 0;
    if (!rectW || rectW < 1) {
      if (typeof window !== 'undefined') requestAnimationFrame(() => recomputeVisible());
      return;
    }
    // Update compact mode from container width
    const compact = rectW < 640;
    setIsCompact(compact);
    // Compute fit using configured left column width instead of measured (which can be inflated)
    const leftCol = COURSE_COL_BASE; // use exact configured width
    const availableForDays = Math.max(0, rectW - leftCol);
    const perCol = (compact ? 48 : 96) + DAY_COL_PADDING;
    const epsilon = 4;
    const fit = Math.max(1, Math.floor((availableForDays + epsilon) / perCol));
    const capped = Math.min(60, fit);
    setLimit((prev) => (prev !== capped ? capped : prev));
    setContainerWidth(Math.round(rectW));
    setDebug({ container: Math.round(rectW), leftCol: Math.round(leftCol), perCol, computed: capped, offset });
  }, [COURSE_COL_BASE, DAY_COL_PADDING, offset]);

  // Recompute filler width to right-align day columns and grow course column with slack
  useEffect(() => {
    if (!containerWidth) return;
    const baseLeftCol = COURSE_COL_BASE;
    const perCol = (isCompact ? 48 : 96) + DAY_COL_PADDING;
    const numCols = (data?.days?.length || 0);
    const slack = Math.max(0, containerWidth - baseLeftCol - perCol * numCols);
    // Allocate slack to course column first (reduce truncation), cap growth to avoid extreme widths
    const maxExtraForCourse = isCompact ? 56 : 120; // allows up to ~176px compact, 320px regular
    const useForCourse = Math.min(slack, maxExtraForCourse);
    const newCourseWidth = baseLeftCol + useForCourse;
    const remaining = Math.max(0, slack - useForCourse);
    setCourseColWidth(Math.round(newCourseWidth));
    setFillerWidth(Math.round(remaining));
  }, [containerWidth, COURSE_COL_BASE, isCompact, DAY_COL_PADDING, data?.days?.length]);

  useEffect(() => {
    // Recompute on mount, when viewport mode changes, and when data mounts (container size may change)
    recomputeVisible();
    if (typeof window !== 'undefined') {
      const onResize = () => recomputeVisible();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  }, [isMobile, data, recomputeVisible]);

  // Observe container size changes (not just window resizes)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      recomputeVisible();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputeVisible, data]);

  // After data renders the table, remeasure on next frame to pick up container width
  useLayoutEffect(() => {
    if (!data) return;
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => recomputeVisible());
    } else {
      recomputeVisible();
    }
  }, [data, isMobile, recomputeVisible]);

  // Clamp offset so we never show more days than exist when limit changes
  useEffect(() => {
    if (!data) return;
    const maxOffset = Math.max(0, data.totalDays - Math.max(1, limit));
    if (offset > maxOffset) setOffset(maxOffset);
  }, [data, limit, offset]);

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

  // Loading phases
  const isInitialLoading = loading && !data;
  const isRefreshing = loading && !!data;
  // Delay showing per-cell skeletons during refresh to avoid flash on fast networks
  const [hasRefreshDelayElapsed, setHasRefreshDelayElapsed] = useState(false);
  useEffect(() => {
    let timeoutId: number | undefined;
    if (isRefreshing) {
      timeoutId = window.setTimeout(() => setHasRefreshDelayElapsed(true), 500);
    } else {
      setHasRefreshDelayElapsed(false);
    }
    return () => { if (timeoutId) window.clearTimeout(timeoutId); };
  }, [isRefreshing, setHasRefreshDelayElapsed]);

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
    <div className="space-y-4 px-0 sm:px-0 py-6 sm:py-8">
      <div className="-mx-4 sm:mx-0">
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
    </div>
  );
  
  if (isInitialLoading) return (
    <div className="space-y-4 px-0 sm:px-0 py-6 sm:py-8">
      <div className="-mx-4 sm:mx-0">
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="flex items-center gap-2">
                  <Skeleton className="h-5 w-48" />
                  <div className="flex-1 flex gap-2 justify-end">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-8 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
  
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!grid || !data) return <div className="p-6">No data.</div>;

  

  return (
    <div className="space-y-4 px-0 sm:px-0 py-6 sm:py-8">
      <div className="-mx-4 sm:mx-0">
        <Card className="p-4">
        {process.env.NEXT_PUBLIC_DEBUG_HISTORY === '1' && debug && (
          <div className="mb-2 text-xs text-slate-500 pl-4">
            cw {debug.container}px · lw {debug.leftCol}px · pc {debug.perCol}px · vis {debug.computed} · off {debug.offset}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-600 pl-4">
            {data.totalDays > 0
              ? (() => {
                  const windowSize = Math.min(limit, grid.days.length);
                  const end = Math.min(data.totalDays, Math.max(1, data.totalDays - offset));
                  const start = Math.min(data.totalDays, Math.max(1, end - windowSize + 1));
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
              disabled={offset + Math.min(limit, grid.days.length) >= data.totalDays}
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
        <div ref={containerRef} className="relative overflow-hidden w-full">
          <table className="border-separate border-spacing-0 table-fixed w-full">
            <colgroup>
              <col style={{ width: courseColWidth, minWidth: courseColWidth, maxWidth: courseColWidth }} />
              <col style={{ width: fillerWidth, minWidth: fillerWidth, maxWidth: fillerWidth }} />
              {grid.days.map((d) => (
                <col key={`col-${d.date}`} style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th ref={firstThRef} className="sticky left-0 z-0 bg-white pl-4 pr-1 py-2 text-left" style={{ width: courseColWidth, minWidth: courseColWidth, maxWidth: courseColWidth }}>Course</th>
                <th className="p-0 bg-white" style={{ width: fillerWidth, minWidth: fillerWidth, maxWidth: fillerWidth }} aria-hidden />
                {[...grid.days].reverse().map((d) => (
                  <th 
                    key={d.date} 
                    className="pl-1 pr-2 py-2 text-sm font-medium text-slate-600 text-center whitespace-nowrap sr-day-col"
                    style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
                  >
                    {isRefreshing ? (
                      hasRefreshDelayElapsed ? (
                        <Skeleton className="h-4 w-14 sm:w-20 mx-auto" />
                      ) : (
                        <span className="inline-block h-4 w-14 sm:w-20" />
                      )
                    ) : (
                      isCompact ? formatHeaderDateMDFromString(d.date) : formatDateMDY(d.date)
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.sections.map((s) => {
                const byDate = grid.recBySection.get(s.id)!;
                return (
                  <tr key={s.id} className="odd:bg-slate-50">
                    <td className="sticky left-0 z-0 bg-white pl-4 pr-1 py-1 text-sm" style={{ width: courseColWidth, minWidth: courseColWidth, maxWidth: courseColWidth }}>
                      <div className="font-medium truncate whitespace-nowrap overflow-hidden">{s.title}</div>
                    </td>
                    <td className="p-0 bg-white" style={{ width: fillerWidth, minWidth: fillerWidth, maxWidth: fillerWidth }} aria-hidden />
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
                          {isRefreshing ? (
                            hasRefreshDelayElapsed ? (
                              <Skeleton className="h-6 w-8 mx-auto rounded" />
                            ) : (
                              <span className="inline-block h-6 w-8" />
                            )
                          ) : (
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
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isRefreshing && hasRefreshDelayElapsed && (
            <div className="absolute inset-0 pointer-events-none">
              {/* subtle shimmer already provided by Skeletons; keep area interactive for navigation */}
            </div>
          )}
        </div>
        )}
        <TooltipOverlay visible={tooltip.visible} text={tooltip.text} anchorX={tooltip.anchorX} anchorY={tooltip.anchorY} />
      </Card>
      </div>
    </div>
  );
}


