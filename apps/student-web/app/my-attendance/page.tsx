"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, Badge, Skeleton, Button } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type HistoryResponse = {
  sections: { id: string; title: string }[];
  days: { date: string }[]; // YYYY-MM-DD
  records: Array<{ sectionId: string; byDate: Record<string, { status: string; originalStatus: string; isManual: boolean; manualChange: { status: string; teacherName: string; createdAt: string } | null }> }>;
  totalDays: number;
  offset: number;
  limit: number;
};

function formatDateMDY(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
  return `${(m).toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}/${y}`;
}

export default function MyAttendancePage() {
  const pathname = usePathname();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [offset, setOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(12);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Use a longer delay to ensure localStorage is available and retry if needed
    const timer = setTimeout(() => {
      const id = localStorage.getItem('snaproll.studentId');
      if (id) {
        setStudentId(id);
        const n = localStorage.getItem('snaproll.studentName');
        if (n) setStudentName(n);
      } else {
        // Retry once more after a longer delay
        setTimeout(() => {
          const retryId = localStorage.getItem('snaproll.studentId');
          setStudentId(retryId);
          const retryName = localStorage.getItem('snaproll.studentName');
          if (retryName) setStudentName(retryName);
        }, 500);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  const loadHistory = useCallback(async (currentOffset: number, currentLimit: number) => {
    if (!studentId) return;
    
    const reqId = ++requestIdRef.current;
    setIsFetching(true);
    setLoading(true);
    setError(null);
    
    try {
      const res = await apiFetch<HistoryResponse>(`/api/students/${studentId}/history?offset=${currentOffset}&limit=${currentLimit}&_=${Date.now()}`);
      if (reqId !== requestIdRef.current) return; // ignore stale requests
      
      setData(res);
      setOffset(res.offset ?? currentOffset);
      setLimit(res.limit ?? currentLimit);
    } catch (e: unknown) {
      if (reqId === requestIdRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to load attendance');
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setIsFetching(false);
        setLoading(false);
      }
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      void loadHistory(offset, limit);
    } else {
      setLoading(false);
    }
  }, [studentId, loadHistory]);

  // Refetch when navigating back to this route to avoid stale in-memory state
  useEffect(() => {
    if (!studentId) return;
    void loadHistory(offset, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Ensure we always show fresh data when navigating to this page or returning to the tab
  useEffect(() => {
    if (!studentId) return;
    const refetch = () => {
      void loadHistory(offset, limit);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', refetch);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', refetch);
    };
  }, [studentId, offset, limit, loadHistory]);

  const grid = useMemo(() => {
    if (!data) return null;
    const { sections, days, records } = data;
    const recBySection = new Map(records.map((r) => [r.sectionId, r.byDate]));
    return { sections, days, recBySection };
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
          <div className="text-sm text-slate-600">
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
                const next = Math.min(Math.max(0, data.totalDays - 1), offset + limit); 
                setOffset(next); 
                void loadHistory(next, limit); 
              }} 
              disabled={offset + grid.days.length >= data.totalDays}
            >
              ← Previous
            </Button>
            {/* Newer page (moves window to more recent dates) */}
            <Button 
              variant="ghost" 
              onClick={() => { 
                const next = Math.max(0, offset - limit); 
                setOffset(next); 
                void loadHistory(next, limit); 
              }} 
              disabled={offset === 0}
            >
              Next →
            </Button>
          </div>
        </div>
        
        <div ref={containerRef} className="relative overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 text-slate-600">Course</th>
                {grid.days.map((d) => (
                  <th key={d.date} className="p-2 text-slate-600 whitespace-nowrap">{formatDateMDY(d.date)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.sections.map((s) => {
                const byDate = grid.recBySection.get(s.id)!;
                return (
                  <tr key={s.id} className="border-t">
                    <td className="p-2 font-medium text-slate-800 whitespace-nowrap">{s.title}</td>
                    {grid.days.map((d) => {
                      const rec = byDate[d.date] || { status: 'BLANK', originalStatus: 'BLANK', isManual: false, manualChange: null };
                      const status = rec.status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'BLANK';
                      const showManual = rec.isManual && rec.status !== rec.originalStatus;
                      const display =
                        status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'EXCUSED' ? 'E' : '–';
                      const tooltipText = showManual && rec.manualChange
                        ? `${rec.manualChange.teacherName} manually changed the status to ${status} on ${formatDateMDY(rec.manualChange.createdAt.slice(0,10))}`
                        : (() => {
                            const name = studentName || 'Student';
                            if (status === 'PRESENT') return `${name} was Present in class on ${formatDateMDY(d.date)}.`;
                            if (status === 'ABSENT') return `${name} was Absent on ${formatDateMDY(d.date)}.`;
                            if (status === 'EXCUSED') return `${name} was Excused on ${formatDateMDY(d.date)}.`;
                            return '';
                          })();
                      return (
                        <td key={d.date} className="p-2 text-center align-middle">
                          <div className="relative group inline-block">
                            {status === 'PRESENT' ? (
                              <Badge tone="green">{display}{showManual ? '*' : ''}</Badge>
                            ) : status === 'ABSENT' ? (
                              <Badge tone="red">{display}{showManual ? '*' : ''}</Badge>
                            ) : status === 'EXCUSED' ? (
                              <Badge tone="yellow">{display}{showManual ? '*' : ''}</Badge>
                            ) : (
                              <span className="text-slate-400">{display}{showManual ? '*' : ''}</span>
                            )}
                            {tooltipText && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                {tooltipText}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                              </div>
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
      </Card>
    </div>
  );
}


