"use client";
import { useEffect, useRef, useState } from 'react';
import { Card, Skeleton, TextInput, Button } from '@snaproll/ui';
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
  const [initialized, setInitialized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  // Inline check-in widget state (must be declared before any returns)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  // Interactive state
  type InteractiveWordCloud = {
    kind: 'wordcloud';
    sessionId: string;
    prompt: string;
    showPromptToStudents: boolean;
    allowMultipleAnswers: boolean;
    sectionId: string;
    hasAnswered?: boolean;
  };
  type InteractivePoll = {
    kind: 'poll';
    sessionId: string;
    prompt: string;
    options: string[];
    showResults: boolean;
    sectionId: string;
    hasAnswered?: boolean;
  };
  type InteractiveSlideshow = {
    kind: 'slideshow';
    sessionId: string;
    title: string;
    filePath: string;
    mimeType: string;
    currentSlide: number;
    totalSlides: number | null;
    showOnDevices: boolean;
    allowDownload: boolean;
    requireStay: boolean;
    preventJump: boolean;
    sectionId: string;
  };

  const [interactive, setInteractive] = useState<
    | null
    | InteractiveWordCloud
    | InteractivePoll
    | InteractiveSlideshow
  >(null);
  const [answer, setAnswer] = useState('');
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const submittedOnceRef = useRef<boolean>(false);
  const lastSeenRef = useRef<number>(Date.now());

  // Poll for interactive activity
  useEffect(() => {
    if (!studentId) return;
    let mounted = true;
    async function tick() {
      try {
        const res = await apiFetch<{ interactive: InteractiveWordCloud | InteractivePoll | null }>(`/api/students/${studentId}/interactive/active`);
        if (!mounted) return;
        setInteractive(res.interactive);
        lastSeenRef.current = Date.now();
      } catch {
        /* ignore */
      }
    }
    tick();
    const interval = window.setInterval(tick, 2000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [studentId]);

  // Reset local single-submit state when a new session starts
  useEffect(() => {
    submittedOnceRef.current = false;
    setSubmitMsg(null);
    setAnswer('');
  }, [interactive?.sessionId]);

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
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
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

  // Refetch when navigating back to this route to avoid stale in-memory state (without skeleton)
  useEffect(() => {
    if (!mounted || !studentId) return;
    load(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Refresh data when returning to this tab/page (no skeleton flash)
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

  if (loading && !initialized) {
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-3">
          <div className="text-center">
            <div className="font-medium">Attendance</div>
            <div className="text-slate-500 text-sm">Enter the code you see on the board:</div>
          </div>
          <div className="flex items-center justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-12 h-12 rounded-xl" />
            ))}
          </div>
        </Card>

        <div className="text-slate-600 text-sm">My courses</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-3 sm:p-4">
              <Skeleton className="aspect-[3/2] w-full rounded-lg mb-3" />
              <Skeleton className="h-5 w-40" />
            </Card>
          ))}
        </div>
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

      {/* Attendance / Check In */}
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
        
        <div className="flex items-center justify-center">
          <button
            className="text-primary font-medium hover:underline"
            onClick={() => { if (studentId) window.location.href = '/my-attendance'; }}
          >
            My attendance →
          </button>
        </div>
      </Card>

      {/* Activities status / answer UI */}
      <Card className="p-6">
        {!interactive ? (
          <div className="border-2 border-dashed rounded-xl p-6 text-center text-slate-600">
            <div className="font-medium mb-1">Activities</div>
            <div className="text-sm">Your instructors have not started any live activites yet...</div>
            <div className="mt-3 flex items-center justify-center gap-2 text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 animate-[pulse_1.2s_0.2s_ease-in-out_infinite]" />
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 animate-[pulse_1.2s_0.4s_ease-in-out_infinite]" />
            </div>
          </div>
        ) : interactive.kind === 'wordcloud' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Word Cloud</div>
              {interactive.showPromptToStudents && (
                <div className="text-slate-500 text-sm">{interactive.prompt}</div>
              )}
            </div>
            {(!interactive.allowMultipleAnswers && (submittedOnceRef.current || !!interactive.hasAnswered)) ? (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                Answer submitted! Waiting for instructor…
              </div>
            ) : (
              <>
                <div className="flex gap-2 items-center">
                  <TextInput
                    value={answer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)}
                    placeholder="Your word or phrase"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextSibling as HTMLButtonElement | null)?.click?.(); } }}
                  />
                  <Button
                    onClick={async () => {
                      if (!studentId || !interactive || !answer.trim()) return;
                      try {
                        await apiFetch(`/api/wordcloud/${interactive.sessionId}/answers`, {
                          method: 'POST',
                          body: JSON.stringify({ studentId, text: answer.trim() }),
                        });
                        setAnswer('');
                        setSubmitMsg('Answer submitted.');
                        if (!interactive.allowMultipleAnswers) submittedOnceRef.current = true;
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : 'Failed to submit.';
                        if (/only allowed to submit one answer/i.test(msg)) {
                          setSubmitMsg('You are only allowed to submit one answer');
                          setAnswer('');
                        } else if (/already submitted/i.test(msg)) {
                          setSubmitMsg('You already submitted that answer');
                          setAnswer('');
                        } else {
                          setSubmitMsg('Submission failed. Try again.');
                        }
                      }
                    }}
                  >Submit</Button>
                </div>
                {submitMsg && (
                  <div className={`mt-2 text-sm rounded-lg border p-2 ${/^Answer submitted/i.test(submitMsg) ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>
                    {submitMsg.replace('submitted.', 'submitted!')}
                  </div>
                )}
              </>
            )}
          </div>
        ) : interactive.kind === 'poll' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Poll</div>
              <div className="text-slate-500 text-sm">{(interactive as InteractivePoll).prompt}</div>
            </div>
            {(interactive as InteractivePoll).hasAnswered ? (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-center w-full flex items-center justify-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L9 13.414l4.707-4.707z"/></svg>
                Response submitted
              </div>
            ) : (
              <div className="space-y-2">
                {(interactive as InteractivePoll).options.map((opt: string, i: number) => (
                  <Button key={i} className="w-full justify-start"
                    onClick={async () => {
                      if (!studentId) return;
                      try {
                        await apiFetch(`/api/poll/${(interactive as InteractivePoll).sessionId}/answers`, { method: 'POST', body: JSON.stringify({ studentId, optionIdx: i }) });
                        setInteractive({ ...(interactive as InteractivePoll), hasAnswered: true });
                      } catch {
                        /* ignore */
                      }
                    }}
                  >{opt}</Button>
                ))}
              </div>
            )}
          </div>
        ) : interactive.kind === 'slideshow' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Activities</div>
              <div className="text-slate-500 text-sm">Your instructor is presenting a slideshow.</div>
            </div>
            {(interactive as InteractiveSlideshow).showOnDevices ? (
              <Button className="w-full" onClick={() => { window.location.href = `/slideshow/view/${(interactive as InteractiveSlideshow).sessionId}`; }}>View Slides Live →</Button>
            ) : (
              <div className="text-slate-600 text-sm text-center">Viewing on your device is disabled.</div>
            )}
          </div>
        ) : null}
      </Card>

      {/* Courses subheading */}
      <div className="text-slate-600 text-sm">My courses</div>

      {sections.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-lg font-medium">No courses yet</div>
          <div className="text-slate-500 mt-2">
            Your instructor hasn&apos;t added you to any courses yet. 
            Please ask your instructor to add your email address to their course roster.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {sections.map((s) => {
            const gradientClass = s.gradient || 'gradient-1';
            const isCheckedIn = checkedInIds.includes(s.id);
            return (
              <Card key={s.id} className="p-3 sm:p-4 flex flex-col overflow-hidden group">
                <div className={`aspect-[3/2] rounded-lg ${gradientClass} mb-3 sm:mb-4 text-white relative overflow-hidden grid place-items-center`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  {/* Checked-in badge */}
                  {isCheckedIn && (
                    <div className="absolute top-2 right-2 z-20 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg ring-1 ring-black/40 inline-flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L9 13.414l4.707-4.707z"/></svg>
                      Checked in
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
                <div className="font-medium mb-2 text-slate-700 truncate">{s.title}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
