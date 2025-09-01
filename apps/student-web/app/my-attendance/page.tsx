"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, Badge, Skeleton, Button } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
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
  const firstThRef = useRef<HTMLTableCellElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Convex hooks
  const currentUser = useQuery((api as any).functions.auth.getCurrentUser);
  const student = useQuery(api.functions.users.get, currentUser?._id ? { id: currentUser._id as any } : "skip");
  const history = useQuery(api.functions.history.getStudentHistory, currentUser?._id ? { studentId: currentUser._id as any, offset, limit } : "skip");

  // Column width calculations
  const COURSE_COL_BASE = 200; // desktop/base px width for course column
  const DAY_COL_CONTENT = isMobile ? 56 : 96; // thinner content on mobile: MM/DD vs MM/DD/YYYY
  const DAY_COL_PADDING = 12; // Adjusted: pl-1 (4px) + pr-2 (8px)
  const PER_COL = DAY_COL_CONTENT + DAY_COL_PADDING; // total column footprint

  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update data when Convex query returns
  useEffect(() => {
    if (history) {
      setData(history as any);
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
                const next = Math.min(Math.max(0, data.totalDays - 1), offset + limit); 
                setOffset(next); 
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
              }} 
              disabled={offset === 0}
            >
              Next →
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
                    className="pl-1 pr-2 py-2 text-sm font-medium text-slate-600 text-center whitespace-nowrap"
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
                      const status = rec.status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'BLANK';
                      const showManual = rec.isManual && rec.status !== rec.originalStatus;
                      const display =
                        status === 'PRESENT' ? 'P' : status === 'ABSENT' ? 'A' : status === 'EXCUSED' ? 'E' : '–';
                      const tooltipText = showManual && rec.manualChange
                        ? (() => {
                            const createdAt = rec.manualChange!.createdAt as any;
                            const dateKey = typeof createdAt === 'number' 
                              ? new Date(createdAt).toISOString().slice(0,10)
                              : (createdAt || '').slice(0,10);
                            return `${rec.manualChange!.teacherName} manually changed the status to ${status} on ${formatDateMDY(dateKey)}`;
                          })()
                        : (() => {
                            const name = studentName || 'Student';
                            if (status === 'PRESENT') return `${name} was Present in class on ${formatDateMDY(d.date)}.`;
                            if (status === 'ABSENT') return `${name} was Absent on ${formatDateMDY(d.date)}.`;
                            if (status === 'EXCUSED') return `${name} was Excused on ${formatDateMDY(d.date)}.`;
                            return '';
                          })();
                      return (
                        <td 
                          key={d.date} 
                          className="pl-1 pr-2 py-2 text-center"
                          style={{ width: DAY_COL_CONTENT, minWidth: DAY_COL_CONTENT, maxWidth: DAY_COL_CONTENT }}
                        >
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
        )}
      </Card>
    </div>
  );
}


