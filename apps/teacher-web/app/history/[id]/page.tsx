"use client";
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@clerk/nextjs';
import { Card, Badge, Button, Skeleton, Modal } from '@snaproll/ui';
import { HiOutlineDocumentArrowDown } from 'react-icons/hi2';
import { formatDateMDY } from '@snaproll/lib';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery, useMutation, useConvex } from 'convex/react';
import { useParams } from 'next/navigation';

type Student = { id: string; firstName: string; lastName: string; email: string };
type Day = { id: string; date: string; attendanceCode: string };
type Record = { 
  classDayId: string; 
  studentId: string; 
  status: Status; 
  isManual: boolean;
  originalStatus: Status; // Add this field to track original status
  manualChange?: {
    status: Status;
    teacherName: string;
    createdAt: string;
  };
};
type StudentRecord = { studentId: string; records: Record[] };

type Status = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'NOT_JOINED' | 'BLANK';

export default function HistoryPage() {
  const params = useParams<{ id: string }>();
  const { isLoaded, isSignedIn } = useAuth();
  const isAuthReady = isLoaded && isSignedIn;
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  // Server-side window equals the number of columns that fit
  const [limit, setLimit] = useState<number>(12);

  // Convex hooks
  const history = useQuery(
    api.functions.history.getSectionHistory,
    isAuthReady && params.id ? { sectionId: params.id as any, offset, limit } : "skip"
  );
  const updateManualStatus = useMutation(api.functions.attendance.updateManualStatus);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstThRef = useRef<HTMLTableCellElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const STUDENT_COL_BASE = isMobile ? 120 : 220; // narrower student column on mobile
  const DAY_COL_CONTENT = isMobile ? 56 : 96; // thinner content on mobile: MM/DD vs MM/DD/YYYY
  const DAY_COL_PADDING = 12; // Adjusted: pl-1 (4px) + pr-2 (8px)
  const PER_COL = DAY_COL_CONTENT + DAY_COL_PADDING; // total column footprint
  const [initialized, setInitialized] = useState(false);
  const [studentColW, setStudentColW] = useState<number>(STUDENT_COL_BASE);
  const studentWidthEffective = isMobile ? STUDENT_COL_BASE : STUDENT_COL_BASE; // ignore measured name width on mobile
  const hasMeasuredMobileRef = useRef(false);
  const initializedRightmostRef = useRef(false);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; anchorX: number; anchorY: number }>(
    { visible: false, text: '', anchorX: 0, anchorY: 0 }
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const convex = useConvex();
  const [debug, setDebug] = useState<{ container: number; leftCol: number; perCol: number; computed: number; offset: number } | null>(null);

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

  function formatHeaderDateMD(date: Date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}/${d}`;
  }

  // Measure the width of the longest visible student name on mobile and set student column width.
  // To avoid cumulative drift, measure only once per mobile session and only when entering mobile.
  useEffect(() => {
    if (!isMobile) {
      hasMeasuredMobileRef.current = false;
      setStudentColW(STUDENT_COL_BASE);
      return;
    }
    if (hasMeasuredMobileRef.current) return;
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const nodes = container.querySelectorAll<HTMLElement>('.sr-student-name');
      let max = 0;
      nodes.forEach((el) => {
        const width = el.scrollWidth;
        if (width > max) max = width;
      });
      // Add small padding so text isn't tight against the first day column
      const computedRaw = Math.min(320, Math.max(120, max + 16));
      // Snap to 4px grid to avoid subpixel rounding oscillations
      const computed = Math.round(computedRaw / 4) * 4;
      setStudentColW(computed);
      hasMeasuredMobileRef.current = true;
    };
    if (typeof window !== 'undefined') requestAnimationFrame(measure);
    else measure();
  }, [isMobile]);

  // Recompute how many day columns fit and update query limit
  const recomputeVisible = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const rectW = containerEl.getBoundingClientRect().width || containerEl.clientWidth || 0;
    if (!rectW || rectW < 1) {
      if (typeof window !== 'undefined') requestAnimationFrame(() => recomputeVisible());
      return;
    }
    // Compute fit using configured left column width instead of measured (which can be inflated)
    const leftCol = studentWidthEffective;
    const availableForDays = Math.max(0, rectW - leftCol);
    const perCol = DAY_COL_CONTENT + DAY_COL_PADDING;
    const epsilon = 4;
    const fit = Math.max(1, Math.floor((availableForDays + epsilon) / perCol));
    const capped = Math.min(60, fit);
    setLimit((prev) => (prev !== capped ? capped : prev));
    setDebug({ container: Math.round(rectW), leftCol: Math.round(leftCol), perCol, computed: capped, offset });
  }, [studentWidthEffective, DAY_COL_CONTENT, DAY_COL_PADDING]);

  useEffect(() => {
    // Compute on mount and on dependencies that affect widths
    recomputeVisible();
    if (typeof window !== 'undefined') {
      const onResize = () => recomputeVisible();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  }, [isMobile, studentWidthEffective, initialized, recomputeVisible]);

  // Observe container size changes (not just window resizes)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      recomputeVisible();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputeVisible]);

  // Clamp offset when limit shrinks so we don't overflow
  useEffect(() => {
    const maxOffset = Math.max(0, (history?.totalDays || 0) - Math.max(1, limit));
    if (offset > maxOffset) setOffset(maxOffset);
  }, [limit, offset, history?.totalDays]);

  // Extract data from Convex query
  const students = history?.students || [];
  const days = history?.days || [];
  const studentRecords = history?.records || [];
  const totalDays = history?.totalDays || 0;

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
  }, [params.id]);

  // Set loading state based on Convex query
  const isFetching = !history;

  // Initialize once data is available so the table renders instead of the skeleton
  useEffect(() => {
    if (history && !initialized) {
      setInitialized(true);
    }
  }, [history, initialized]);

  const startExport = useCallback(async () => {
    try {
      setExportError(null);
      setExportOpen(true);
      setExporting(true);
      if (!params.id) throw new Error('Missing section id');
      const data = await convex.query((api as any).functions.history.exportSectionHistory, { sectionId: params.id as any });
      const { days, rows } = data as { days: string[]; rows: Array<{ firstName: string; lastName: string; email: string; statuses: string[] }>; };
      const header = ['First Name', 'Last Name', 'Email', ...days];
      const lines = [header];
      for (const r of rows) {
        lines.push([r.firstName, r.lastName, r.email, ...r.statuses.map(s => s || 'BLANK')]);
      }
      const csv = lines.map(cols => cols.map((c) => {
        const v = String(c ?? '');
        // Escape quotes and wrap fields containing commas, quotes or newlines
        if (/[",\n]/.test(v)) {
          return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      }).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      const date = new Date().toISOString().slice(0,10);
      a.download = `attendance_${params.id}_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(urlObj);
      setExporting(false);
      setExportOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setExportError(message);
      setExporting(false);
    }
  }, [params.id]);

  // (duplicate removed)

  async function updateStatus(classDayId: string, studentId: string, newStatus: Status) {
    try {
      await updateManualStatus({
        classDayId: classDayId as any,
        studentId: studentId as any,
        status: newStatus as any,
      });
      // Convex reactivity will refresh the history query automatically
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  function renderStatusCell(record: Record, studentName: string, date: string) {
    const status = record.status;
    const isManual = record.isManual;
    const originalStatus = record.originalStatus;
    
    // Only show manual indicators if the status is actually different from original
    const showManualIndicators = isManual && status !== originalStatus;
    
    // Disable selecting BLANK for previous days using Eastern Time boundary
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    const partsNow = fmt.formatToParts(now);
    const y = Number(partsNow.find(p => p.type === 'year')!.value);
    const m = Number(partsNow.find(p => p.type === 'month')!.value);
    const d = Number(partsNow.find(p => p.type === 'day')!.value);
    const guessUtc = Date.UTC(y, m - 1, d, 5, 0, 0, 0);
    const hms = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(guessUtc);
    const hh = Number(hms.find(p => p.type === 'hour')!.value);
    const mm = Number(hms.find(p => p.type === 'minute')!.value);
    const ss = Number(hms.find(p => p.type === 'second')!.value);
    const startOfTodayEt = guessUtc - (((hh * 60 + mm) * 60 + ss) * 1000);
    const isPastDay = new Date(date).getTime() < startOfTodayEt;

    const statusOptions: { value: Status; label: string; disabled?: boolean }[] = [
      { value: 'PRESENT', label: 'P' },
      { value: 'ABSENT', label: 'A' },
      { value: 'EXCUSED', label: 'E' },
      { value: 'NOT_JOINED', label: 'NE' },
      { value: 'BLANK', label: '–', disabled: originalStatus !== 'BLANK' || isPastDay }
    ];

    const statusDisplay = (() => {
      switch (status) {
        case 'PRESENT':
          return <Badge tone="green">P{showManualIndicators ? '*' : ''}</Badge>;
        case 'ABSENT':
          return <Badge tone="red">A{showManualIndicators ? '*' : ''}</Badge>;
        case 'EXCUSED':
          return <Badge tone="yellow">E{showManualIndicators ? '*' : ''}</Badge>;
        case 'NOT_JOINED':
          return <Badge tone="gray">NE{showManualIndicators ? '*' : ''}</Badge>;
        default:
          return <span className="text-slate-400">–{showManualIndicators ? '*' : ''}</span>;
      }
    })();

    // Generate tooltip text based on whether it's a manual change or original status
    let tooltipText = '';
    if (showManualIndicators && record.manualChange) {
      tooltipText = `Instructor manually changed the status to ${status} on ${formatDateMDY(new Date(record.manualChange.createdAt))}`;
    } else {
      // Standard attendance tooltip
      switch (status) {
        case 'PRESENT':
          tooltipText = `${studentName} was Present in class on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'ABSENT':
          tooltipText = `${studentName} was Absent on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'EXCUSED':
          tooltipText = `${studentName} was Excused on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'NOT_JOINED':
          tooltipText = `${studentName} was not enrolled in this section on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'BLANK':
          tooltipText = `No attendance recorded for ${studentName} on ${formatDateMDY(new Date(date))}.`;
          break;
      }
    }

    let selectEl: HTMLSelectElement | null = null;
    return (
      <div
        className="relative group cursor-pointer select-none flex items-center justify-center"
        onMouseEnter={(e) => { if (tooltipText) showTooltip(tooltipText, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
        onMouseLeave={hideTooltip}
        onTouchStart={(e) => { if (tooltipText) showTooltip(tooltipText, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
        onTouchEnd={hideTooltip}
        onClick={() => { try { selectEl?.click(); } catch { /* ignore */ } }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { selectEl?.click(); } catch { /* ignore */ } } }}
        tabIndex={0}
        title={tooltipText}
      >
        <select
          ref={(el) => { selectEl = el; }}
          value={status}
          onChange={(e) => updateStatus(record.classDayId, record.studentId, e.target.value as Status)}
          className="absolute inset-0 z-50 opacity-[0.01] bg-transparent border-none cursor-pointer pointer-events-auto w-full h-full p-0 focus:outline-none focus:ring-2 focus:ring-primary rounded"
          aria-label="Change attendance status"
          onMouseEnter={(e) => { if (tooltipText) showTooltip(tooltipText, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
          onMouseLeave={hideTooltip}
          onTouchStart={(e) => { if (tooltipText) showTooltip(tooltipText, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
          onTouchEnd={hideTooltip}
        >
          {statusOptions.map(option => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none flex items-center justify-center group-hover:brightness-95">
          {statusDisplay}
        </div>
      </div>
    );
  }

  // Render skeleton while initializing table (do not block on empty arrays)
  if (!initialized) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-slate-600 pl-4">Loading…</div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-6 w-56 rounded" />
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Render shell with loading overlay instead of blank screen
  return (
    <Card className="p-4">
      {process.env.NEXT_PUBLIC_DEBUG_HISTORY === '1' && debug && (
        <div className="mb-2 text-xs text-slate-500 pl-4">
          cw {debug.container}px · lw {debug.leftCol}px · pc {debug.perCol}px · vis {debug.computed} · off {debug.offset}
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-600 pl-4">
          {totalDays > 0
            ? (() => {
                const windowSize = Math.min(limit, days.length);
                const end = Math.min(totalDays, Math.max(1, totalDays - offset));
                const start = Math.min(totalDays, Math.max(1, end - windowSize + 1));
                return <>{start}–{end} of {totalDays} class days</>;
              })()
            : '0 of 0 class days'}
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => startExport()} className="inline-flex items-center gap-2">
            <HiOutlineDocumentArrowDown className="h-5 w-5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          {/* Older page (moves window to older dates) */}
          <Button variant="ghost" onClick={() => { const step = Math.max(1, limit); const maxOffset = Math.max(0, totalDays - step); const next = Math.min(maxOffset, offset + step); setOffset(next); }} disabled={offset + Math.min(limit, days.length) >= totalDays}>
            ← <span className="hidden sm:inline">Previous</span>
          </Button>
          {/* Newer page (moves window to more recent dates) */}
          <Button variant="ghost" onClick={() => { const step = Math.max(1, limit); const next = Math.max(0, offset - step); setOffset(next); }} disabled={offset === 0}>
            <span className="hidden sm:inline">Next</span> →
          </Button>
        </div>
      </div>
      {/* Blank-state when no history exists, only after data has initialized */}
      {initialized && totalDays === 0 ? (
        <div className="py-12 grid place-items-center">
          <div className="text-center max-w-md">
            <div className="text-lg font-semibold mb-1">No attendance history yet</div>
            <div className="text-slate-600">Start taking attendance to see it appear here.</div>
          </div>
        </div>
      ) : (
      <div ref={containerRef} className="relative overflow-hidden w-full">
      <table className="min-w-full border-separate border-spacing-0 table-fixed">
        <thead>
          <tr>
            <th ref={firstThRef} className="sticky left-0 z-0 bg-white pl-4 pr-1 py-2 text-left" style={{ width: studentWidthEffective, minWidth: studentWidthEffective, maxWidth: studentWidthEffective }}>Student</th>
            {[...days].reverse().map((day) => (
              <th
                key={day.id}
                className="pl-1 pr-2 py-2 text-sm font-medium text-slate-600 text-center whitespace-nowrap sr-day-col"
                style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
              >
                {isMobile ? formatHeaderDateMD(new Date(day.date)) : formatDateMDY(new Date(day.date))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student: Student, i: number) => (
            <tr key={student.id} className="odd:bg-slate-50">
              <td className="sticky left-0 z-0 bg-white pl-4 pr-1 py-1 text-sm" style={{ width: studentWidthEffective, minWidth: studentWidthEffective, maxWidth: studentWidthEffective }}>
                <div className="font-medium truncate whitespace-nowrap overflow-hidden sr-student-name">{student.firstName} {student.lastName}</div>
                <div className="text-xs text-slate-500 truncate whitespace-nowrap overflow-hidden hidden sm:block">{student.email}</div>
              </td>
              {[...days].reverse().map((day, j) => {
                const reversedIndex = days.length - 1 - j;
                const record = studentRecords[i]?.records[reversedIndex];
                return (
                  <td
                    key={`${student.id}-${day.id}`}
                    className="pl-1 pr-2 py-2 text-center"
                    style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
                  >
                    {record ? renderStatusCell(record, `${student.firstName} ${student.lastName}`, day.date) : <span className="text-slate-400">–</span>}
                  </td>
                );
              })}
            </tr>
          ))}
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
      {/* Export modal */}
      <Modal open={exportOpen} onClose={() => (exporting ? null : setExportOpen(false))}>
        <Card className="p-6 w-[90vw] max-w-md space-y-4">
          <div className="text-lg font-semibold">Export Attendance</div>
          {exportError ? (
            <div className="text-sm text-red-600">{exportError}</div>
          ) : (
            <div className="text-sm text-slate-600">Preparing CSV for all days. This may take a moment…</div>
          )}
          <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
            <div className={`h-full bg-slate-600 ${exporting ? 'animate-pulse' : ''}`} style={{ width: '60%' }} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setExportOpen(false)} disabled={exporting}>Close</Button>
          </div>
        </Card>
      </Modal>
    </Card>
  );
}
