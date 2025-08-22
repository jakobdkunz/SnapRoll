"use client";
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@snaproll/ui';
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
  const [studentId, setStudentId] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStudentId(localStorage.getItem('snaproll.studentId'));
  }, []);

  useEffect(() => {
    async function load(id: string) {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<HistoryResponse>(`/api/students/${id}/history`);
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

  const grid = useMemo(() => {
    if (!data) return null;
    const { sections, days, records } = data;
    const recBySection = new Map(records.map((r) => [r.sectionId, r.byDate]));
    return { sections, days, recBySection };
  }, [data]);

  if (!studentId) return <div className="p-6">Please go back and enter your email.</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!grid) return <div className="p-6">No data.</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-slate-600">Section</th>
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
                      status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'EXCUSED' ? 'E' : '-';
                    const tooltipText = showManual && rec.manualChange
                      ? `${rec.manualChange.teacherName} manually changed the status to ${status} on ${formatDateMDY(rec.manualChange.createdAt.slice(0,10))}`
                      : (() => {
                          if (status === 'PRESENT') return `${s.title} was Present in class on ${formatDateMDY(d.date)}.`;
                          if (status === 'ABSENT') return `${s.title} was Absent on ${formatDateMDY(d.date)}.`;
                          if (status === 'EXCUSED') return `${s.title} was Excused on ${formatDateMDY(d.date)}.`;
                          return '';
                        })();
                    return (
                      <td key={d.date} className="p-2 text-center align-middle">
                        <div className="relative group inline-block">
                          <div className="px-2 py-1 rounded-md bg-slate-100 text-slate-800 inline-flex items-center justify-center min-w-[2rem]">
                            <span>{display}{showManual ? '*' : ''}</span>
                          </div>
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


