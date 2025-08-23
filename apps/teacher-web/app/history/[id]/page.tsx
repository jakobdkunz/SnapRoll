"use client";
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, Badge, Button, Skeleton, Modal } from '@snaproll/ui';
import { formatDateMDY } from '@snaproll/lib';
import { apiFetch, getApiBaseUrl } from '@snaproll/api-client';
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
  const [students, setStudents] = useState<Student[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  // removed unused `loading` state
  const [totalDays, setTotalDays] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(12);
  const [isFetching, setIsFetching] = useState<boolean>(false);
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

  const STUDENT_COL_BASE = 220; // desktop/base px width for student column
  const DAY_COL_CONTENT = isMobile ? 56 : 96; // thinner content on mobile: MM/DD vs MM/DD/YYYY
  const DAY_COL_PADDING = 12; // Adjusted: pl-1 (4px) + pr-2 (8px)
  const PER_COL = DAY_COL_CONTENT + DAY_COL_PADDING; // total column footprint
  const [initialized, setInitialized] = useState(false);
  const [studentColW, setStudentColW] = useState<number>(STUDENT_COL_BASE);
  const studentWidthEffective = isMobile ? studentColW : STUDENT_COL_BASE;
  const hasMeasuredMobileRef = useRef(false);
  const initializedRightmostRef = useRef(false);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; anchorX: number; anchorY: number }>(
    { visible: false, text: '', anchorX: 0, anchorY: 0 }
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const finalizeOnceRef = useRef(false);

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

  const loadHistory = useCallback(async (currentOffset: number, currentLimit: number) => {
    const reqId = ++requestIdRef.current;
    setIsFetching(true);
    try {
      // Ensure blanks are finalized to ABSENT prior to first history load for accurate totals
      if (!finalizeOnceRef.current) {
        try {
          await apiFetch(`/api/sections/${params.id}/finalize-blanks`, { method: 'POST' });
        } catch {
          /* ignore finalize errors */
        } finally {
          finalizeOnceRef.current = true;
        }
      }
      const data = await apiFetch<{ 
        students: Student[]; 
        days: Day[]; 
        records: StudentRecord[];
        totalDays: number;
        offset: number;
        limit: number;
      }>(`/api/sections/${params.id}/history?offset=${currentOffset}&limit=${currentLimit}`);
      if (reqId !== requestIdRef.current) return; // ignore stale

      // Default to the most recent page: offset 0 (API returns days desc),
      // then reverse for display so newest ends up on the right.
      if (!initializedRightmostRef.current) {
        const desiredOffset = 0;
        const current = data.offset ?? currentOffset;
        initializedRightmostRef.current = true;
        if (desiredOffset !== current) {
          await loadHistory(desiredOffset, data.limit || currentLimit);
          return; // don't commit intermediate (oldest) page
        }
      }

      setStudents(data.students);
      setDays(data.days);
      setStudentRecords(data.records);
      setTotalDays(data.totalDays || 0);
      setOffset(data.offset ?? currentOffset);
      setLimit(data.limit ?? currentLimit);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      if (reqId === requestIdRef.current) setIsFetching(false);
    }
  }, [params.id]);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
  }, [params.id]);

  // Compute initial columns based on actual measured widths before first fetch
  useEffect(() => {
    if (initialized) return;
    const measure = () => {
      const el = containerRef.current;
      const containerWidth = el?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
      const CARD_INNER_PADDING = 32; // matches Card p-4
      const studentWidth = studentWidthEffective;
      const available = Math.max(0, containerWidth - studentWidth - CARD_INNER_PADDING);
      const initialLimit = Math.max(3, Math.min(60, Math.floor(available / PER_COL)));
      if (initialLimit !== limit) setLimit(initialLimit);
      setInitialized(true);
      loadHistory(offset, initialLimit);
    };
    if (typeof window !== 'undefined') {
      requestAnimationFrame(measure);
    } else {
      measure();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, params.id, studentWidthEffective, PER_COL]);

  // Refresh on focus/visibility to avoid stale columns/statuses
  useEffect(() => {
    function onFocus() {
      loadHistory(offset, limit);
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') loadHistory(offset, limit);
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [params.id, offset, limit, loadHistory]);

  // Schedule finalize + reload at next local midnight to add a new day column
  useEffect(() => {
    function msUntilNextMidnight() {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return next.getTime() - now.getTime();
    }
    let timeout: number | undefined;
    function schedule() {
      const ms = msUntilNextMidnight();
      timeout = window.setTimeout(async () => {
        try {
          await apiFetch(`/api/sections/${params.id}/finalize-blanks`, { method: 'POST' });
        } catch {/* ignore finalize at midnight */}
        await loadHistory(offset, limit);
        schedule();
      }, ms + 100);
    }
    schedule();
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [params.id, offset, limit, loadHistory]);

  const startExport = useCallback(async () => {
    try {
      setExportError(null);
      setExportOpen(true);
      setExporting(true);
      // Call API app directly for CSV
      const base = getApiBaseUrl();
      const apiUrl = `${base}/api/sections/${params.id}/export?t=${Date.now()}`;
      const res = await fetch(apiUrl, { method: 'GET', cache: 'no-store' });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'attendance.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      setExporting(false);
      setExportOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setExportError(message);
      setExporting(false);
    }
  }, [params.id]);

  // (duplicate removed)

  // Recalculate how many columns fit based on container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const containerWidth = el.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
      const CARD_INNER_PADDING = 32;
      const studentWidth = studentWidthEffective;
      const available = Math.max(0, containerWidth - studentWidth - CARD_INNER_PADDING);
      const cols = Math.max(3, Math.min(60, Math.floor(available / PER_COL)));
      if (cols !== limit) {
        setLimit(cols);
        // Keep newest page by default after resize
        const nextOffset = 0;
        setOffset(nextOffset);
        loadHistory(nextOffset, cols);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [limit, loadHistory, totalDays, studentWidthEffective, PER_COL]);

  async function updateStatus(classDayId: string, studentId: string, newStatus: Status) {
    if (!teacherId) return;
    
    try {
      await apiFetch(`/api/sections/${params.id}/history/manual-status`, {
        method: 'POST',
        body: JSON.stringify({
          classDayId,
          studentId,
          status: newStatus,
          teacherId
        })
      });
      
      // Reload history to get updated data
      await loadHistory(offset, limit);
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
    
    const statusOptions: { value: Status; label: string; disabled?: boolean }[] = [
      { value: 'PRESENT', label: 'P' },
      { value: 'ABSENT', label: 'A' },
      { value: 'EXCUSED', label: 'E' },
      { value: 'BLANK', label: '–', disabled: originalStatus !== 'BLANK' }
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
          return <Badge tone="gray">NJ{showManualIndicators ? '*' : ''}</Badge>;
        default:
          return <span className="text-slate-400">–{showManualIndicators ? '*' : ''}</span>;
      }
    })();

    // Generate tooltip text based on whether it's a manual change or original status
    let tooltipText = '';
    if (showManualIndicators && record.manualChange) {
      tooltipText = `${record.manualChange.teacherName} manually changed the status to ${status} on ${formatDateMDY(new Date(record.manualChange.createdAt))}`;
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
          tooltipText = `${studentName} did not join the section on ${formatDateMDY(new Date(date))}.`;
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

  // Render skeleton while initializing table
  if (!initialized || days.length === 0 || students.length === 0) {
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
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-600 pl-4">
          {days.length > 0 && totalDays > 0
            ? <>Showing {Math.min(totalDays, offset + 1)}–{Math.min(totalDays, offset + days.length)} of {totalDays} days</>
            : 'Loading…'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => startExport()}>
            Export CSV
          </Button>
          {/* Older page (moves window to older dates) */}
          <Button variant="ghost" onClick={() => { const next = Math.min(Math.max(0, totalDays - 1), offset + limit); setOffset(next); loadHistory(next, limit); }} disabled={offset + days.length >= totalDays}>
            ← <span className="hidden sm:inline">Previous</span>
          </Button>
          {/* Newer page (moves window to more recent dates) */}
          <Button variant="ghost" onClick={() => { const next = Math.max(0, offset - limit); setOffset(next); loadHistory(next, limit); }} disabled={offset === 0}>
            <span className="hidden sm:inline">Next</span> →
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="relative overflow-hidden">
      <table className="min-w-full border-separate border-spacing-0 table-fixed">
        <thead>
          <tr>
            <th ref={firstThRef} className="sticky left-0 z-0 bg-white pl-4 pr-1 py-2 text-left" style={{ width: studentWidthEffective, minWidth: studentWidthEffective, maxWidth: studentWidthEffective }}>Student</th>
            {[...days].reverse().map((day) => (
              <th
                key={day.id}
                className="pl-1 pr-2 py-2 text-sm font-medium text-slate-600 text-center whitespace-nowrap"
                style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
              >
                {isMobile ? formatHeaderDateMD(new Date(day.date)) : formatDateMDY(new Date(day.date))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => (
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
