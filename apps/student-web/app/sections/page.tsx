"use client";
import { useEffect, useRef, useState } from 'react';
import { Card } from '@snaproll/ui';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@snaproll/api-client';

type Section = { id: string; title: string; gradient?: string };

type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

type SectionsResponse = { sections: Section[]; checkedInSectionIds?: string[] };

type CheckinResponse = { ok: boolean; status: string; section?: { id: string; title: string } };

export default function SectionsPage() {
  const pathname = usePathname();
  const [sections, setSections] = useState<Section[]>([]);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  // Inline check-in widget state (must be declared before any returns)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Submit when 4 digits are present
  const onCheckin = async () => {
    setConfirmMsg(null);
    setCheckinError(null);
    const code = digits.join('');
    if (!/^[0-9]{4}$/.test(code) || !studentId || checking) return;
    try {
      setChecking(true);
      const res = await apiFetch<CheckinResponse>(
        '/api/attendance/checkin',
        { method: 'POST', body: JSON.stringify({ code, studentId }) }
      );
      if (res.ok) {
        const className = res.section?.title ?? 'class';
        setConfirmMsg(`Checked in to ${className}!`);
        if (res.section?.id) {
          setCheckedInIds((prev) => (prev.includes(res.section!.id) ? prev : [...prev, res.section!.id]));
        }
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      } else {
        setCheckinError('Failed to check in. Please try again.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to check in.';
      setCheckinError(msg);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const id = localStorage.getItem('snaproll.studentId');
    setStudentId(id);
  }, []);

  useEffect(() => {
    async function refreshProfile(id: string) {
      try {
        const data = await apiFetch<StudentProfile>(`/api/students/${id}`);
        const name = `${data.student.firstName} ${data.student.lastName}`;
        setStudentName(name);
        localStorage.setItem('snaproll.studentName', name);
        localStorage.setItem('snaproll.studentEmail', data.student.email);
      } catch {
        // ignore profile fetch errors for now
      }
    }
    if (mounted && studentId) {
      refreshProfile(studentId);
    }
  }, [mounted, studentId]);

  async function load(currentStudentId: string) {
    try {
      // Add a cache-buster to force fresh data even during client-side navigations
      const data = await apiFetch<SectionsResponse>(`/api/students/${currentStudentId}/sections?_=${Date.now()}`);
      setSections(data.sections);
      setCheckedInIds(data.checkedInSectionIds || []);
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoading(false);
    }
  }

  // (removed duplicate onCheckin)

  // Autosubmit when all 4 digits are present
  const allFilled = digits.every((d) => /\d/.test(d) && d.length === 1);
  useEffect(() => {
    if (allFilled) void onCheckin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFilled]);

  useEffect(() => {
    if (!mounted) return;
    if (studentId) {
      setLoading(true);
      load(studentId);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, studentId]);

  // Schedule a refresh exactly at next local midnight to roll over daily state
  useEffect(() => {
    if (!mounted || !studentId) return;
    const currentStudentId = studentId as string;
    function msUntilNextMidnight() {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return next.getTime() - now.getTime();
    }
    let timeout: number | undefined;
    function schedule() {
      const ms = msUntilNextMidnight();
      timeout = window.setTimeout(async () => {
        setLoading(true);
        await load(currentStudentId);
        // schedule again for the following midnight
        schedule();
      }, ms + 100); // small buffer
    }
    schedule();
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [mounted, studentId]);

  // Refetch when navigating back to this route to avoid stale in-memory state
  useEffect(() => {
    if (!mounted || !studentId) return;
    setLoading(true);
    load(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Refresh data when returning to this tab/page (prevents stale titles/gradients after visiting other pages)
  useEffect(() => {
    if (!studentId) return;
    const onFocus = () => load(studentId);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load(studentId);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onFocus);
    };
  }, [studentId]);

  // Refresh data when the tab regains focus or becomes visible
  useEffect(() => {
    function refreshOnFocus() {
      if (!mounted || !studentId) return;
      setLoading(true);
      load(studentId);
    }
    window.addEventListener('focus', refreshOnFocus);
    function onVisibility() {
      if (document.visibilityState === 'visible') refreshOnFocus();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mounted, studentId]);

  if (!mounted) return null;
  if (!studentId) return <div>Please go back and enter your email.</div>;

  if (loading) {
    return (
      <div className="text-center">
        <div className="text-lg">Loading your sections...</div>
      </div>
    );
  }

  function moveFocus(index: number, direction: 1 | -1) {
    const next = index + direction;
    if (next >= 0 && next < inputRefs.length) {
      inputRefs[next].current?.focus();
    }
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 1);
    setDigits((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
    if (val) {
      moveFocus(index, 1);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits((prev) => {
          const copy = [...prev];
          copy[index] = '';
          return copy;
        });
      } else {
        moveFocus(index, -1);
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    const next = [ '', '', '', '' ];
    for (let i = 0; i < Math.min(4, text.length); i++) {
      next[i] = text[i];
    }
    setDigits(next);
    const filled = next.filter(Boolean).length;
    if (filled < 4) {
      inputRefs[filled].current?.focus();
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome header at the top */}
      <div className="text-center">
        <div className="text-xl font-semibold">Welcome, {studentName ?? localStorage.getItem('snaproll.studentName')}!</div>
      </div>

      {/* Inline Attendance / Check In */}
      <Card className="p-6 space-y-3">
        <div className="text-center">
          <div className="font-medium">Attendance</div>
          <div className="text-slate-500 text-sm">Enter the code you see on the board:</div>
        </div>
        <div className="flex items-center justify-center gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              className="w-12 h-12 text-center text-xl rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              inputMode="numeric"
              pattern="\\d*"
              maxLength={1}
              value={d}
              disabled={checking}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
            />
          ))}
        </div>
        {confirmMsg && (
          <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{confirmMsg}</div>
        )}
        {checkinError && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{checkinError}</div>
        )}
      </Card>

      {/* My attendance link */}
      <Card className="p-4">
        <button
          className="text-primary font-medium"
          onClick={() => {
            if (studentId) window.location.href = '/my-attendance';
          }}
        >
          My attendance →
        </button>
      </Card>

      {/* Sections subheading */}
      <div className="text-slate-600 text-sm">Your sections</div>

      {sections.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-lg font-medium">No sections yet</div>
          <div className="text-slate-500 mt-2">
            Your instructor hasn&apos;t added you to any sections yet. 
            Please ask your instructor to add your email address to their section roster.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sections.map((s) => {
            const gradientClass = s.gradient || 'gradient-1';
            const isCheckedIn = checkedInIds.includes(s.id);
            return (
              <Card key={s.id} className="p-4 flex flex-col overflow-hidden group">
                <div className={`aspect-[3/2] rounded-lg ${gradientClass} mb-4 text-white relative overflow-hidden grid place-items-center`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  {/* Checked-in badge */}
                  {isCheckedIn && (
                    <div className="absolute top-2 right-2 z-20 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg ring-1 ring-black/40">
                      Checked in ✅
                    </div>
                  )}
                  <div className="relative z-10 text-center">
                    <div className="font-futuristic font-bold text-lg leading-tight px-2">
                      {s.title}
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white/20 rounded-full"></div>
                  <div className="absolute bottom-2 right-2 w-2 h-2 bg-white/30 rounded-full"></div>
                </div>
                <div className="font-medium mb-2 text-slate-700">{s.title}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
