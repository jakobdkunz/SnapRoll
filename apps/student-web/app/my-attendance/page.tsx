"use client";
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card, Badge, Skeleton } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type HistoryResponse = {
  sections: { id: string; title: string }[];
  days: { date: string }[]; // YYYY-MM-DD
  records: Array<{ sectionId: string; byDate: Record<string, { status: string; originalStatus: string; isManual: boolean; manualChange: { status: string; teacherName: string; createdAt: string } | null }> }>;
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
  useEffect(() => {
    const id = localStorage.getItem('snaproll.studentId');
    setStudentId(id);
    const n = localStorage.getItem('snaproll.studentName');
    if (n) setStudentName(n);
  }, []);

  useEffect(() => {
    async function load(id: string) {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<HistoryResponse>(`/api/students/${id}/history?_=${Date.now()}`);
        setData(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load attendance');
      } finally {
        setLoading(false);
      }
    }
    if (studentId) {
      void load(studentId);
    } else {
      setLoading(false);
    }
  }, [studentId]);

  // Refetch when navigating back to this route to avoid stale in-memory state
  useEffect(() => {
    if (!studentId) return;
    void (async () => {
      try {
        const res = await apiFetch<HistoryResponse>(`/api/students/${studentId}/history?_=${Date.now()}`);
        setData(res);
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Ensure we always show fresh data when navigating to this page or returning to the tab
  useEffect(() => {
    if (!studentId) return;
    const refetch = () => {
      void (async () => {
        try {
          const res = await apiFetch<HistoryResponse>(`/api/students/${studentId}/history?_=${Date.now()}`);
          setData(res);
        } catch {
          /* ignore transient fetch errors */
        }
      })();
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
  }, [studentId]);

  const grid = useMemo(() => {
    if (!data) return null;
    const { sections, days, records } = data;
    const recBySection = new Map(records.map((r) => [r.sectionId, r.byDate]));
    return { sections, days, recBySection };
  }, [data]);


  if (!studentId) return <div className="p-6">Please go back and enter your email.</div>;
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
  if (!grid) return <div className="p-6">No data.</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 overflow-x-auto">
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
      </Card>
    </div>
  );
}


