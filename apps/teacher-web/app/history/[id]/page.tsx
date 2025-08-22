"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Badge, Button } from '@snaproll/ui';
import { formatDateMDY } from '@snaproll/lib';
import { apiFetch } from '@snaproll/api-client';
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
  const [loading, setLoading] = useState(true);
  const [totalDays, setTotalDays] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(12);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstThRef = useRef<HTMLTableCellElement | null>(null);
  const DAY_COL_CONTENT = 96; // content width in px to fit MM/DD/YYYY
  const DAY_COL_PADDING = 16; // Tailwind p-2 adds 8px left + 8px right
  const PER_COL = DAY_COL_CONTENT + DAY_COL_PADDING; // total column footprint

  const loadHistory = useCallback(async (currentOffset: number, currentLimit: number) => {
    const reqId = ++requestIdRef.current;
    setIsFetching(true);
    try {
      const data = await apiFetch<{ 
        students: Student[]; 
        days: Day[]; 
        records: StudentRecord[];
        totalDays: number;
        offset: number;
        limit: number;
      }>(`/api/sections/${params.id}/history?offset=${currentOffset}&limit=${currentLimit}`);
      if (reqId !== requestIdRef.current) return; // ignore stale
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
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
    
    if (id) loadHistory(offset, limit);
  }, [params.id]);

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

  // Schedule a reload at next local midnight to add a new day column
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
        await loadHistory(offset, limit);
        schedule();
      }, ms + 100);
    }
    schedule();
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [params.id, offset, limit, loadHistory]);

  // (duplicate removed)

  // Recalculate how many columns fit based on container and first column widths
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const containerWidth = el.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
      const horizontalPadding = 32; // card/container padding/scrollbar buffer
      const available = Math.max(0, containerWidth - 260 - horizontalPadding);
      const cols = Math.max(3, Math.min(60, Math.floor(available / PER_COL)));
      if (cols !== limit) {
        setLimit(cols);
        loadHistory(offset, cols);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [limit, loadHistory, offset, PER_COL]);

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

    return (
      <div className="relative group">
        <select
          value={status}
          onChange={(e) => updateStatus(record.classDayId, record.studentId, e.target.value as Status)}
          className="appearance-none bg-transparent border-none cursor-pointer text-center w-full h-full p-2 focus:outline-none focus:ring-2 focus:ring-primary rounded"
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
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {statusDisplay}
        </div>
        {tooltipText && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
            {tooltipText}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <div>Loading history...</div>;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-600">Showing {Math.min(totalDays, offset + 1)}–{Math.min(totalDays, offset + days.length)} of {totalDays} days</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => { const next = Math.max(0, offset - limit); setOffset(next); loadHistory(next, limit); }} disabled={offset === 0}>← Previous</Button>
          <Button variant="ghost" onClick={() => { const next = Math.min(Math.max(0, totalDays - 1), offset + limit); setOffset(next); loadHistory(next, limit); }} disabled={offset + days.length >= totalDays}>Next →</Button>
        </div>
      </div>
      <div ref={containerRef} className="relative overflow-visible">
      <table className="min-w-full border-separate border-spacing-0 table-fixed">
        <thead>
          <tr>
            <th ref={firstThRef} className="sticky left-0 z-10 bg-white p-2 text-left">Student</th>
            {[...days].reverse().map((day) => (
              <th
                key={day.id}
                className="p-2 text-sm font-medium text-slate-600 text-center whitespace-nowrap"
                style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
              >
                {formatDateMDY(new Date(day.date))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => (
            <tr key={student.id} className="odd:bg-slate-50">
              <td className="sticky left-0 z-10 bg-white px-2 py-1 text-sm">
                <div className="font-medium">{student.firstName} {student.lastName}</div>
                <div className="text-xs text-slate-500">{student.email}</div>
              </td>
              {[...days].reverse().map((day, j) => {
                const reversedIndex = days.length - 1 - j;
                const record = studentRecords[i]?.records[reversedIndex];
                return (
                  <td
                    key={`${student.id}-${day.id}`}
                    className="p-2 text-center"
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
    </Card>
  );
}
