"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, Badge, Button, TextInput, Skeleton } from '@snaproll/ui';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@clerk/nextjs';

type CheckinResponse = {
  ok: boolean;
  record?: any;
  status?: string;
  section?: { id: string; title: string };
  error?: string;
};

type Section = {
  id: string;
  title: string;
  gradient: string;
};

export default function SectionsPage() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Convex hooks
  const checkInMutation = useMutation(api.functions.attendance.checkIn);
  const submitWordcloud = useMutation(api.functions.wordcloud.submitAnswer);
  const submitPoll = useMutation(api.functions.polls.submitAnswer);
  
  // Get current user from Convex based on Clerk identity
  const currentUser = useQuery((api as any).functions.auth.getCurrentUser);
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const didUpsertRef = useRef(false);
  useEffect(() => {
    if (didUpsertRef.current) return;
    if (!isLoaded || !isSignedIn) return;
    if (currentUser === undefined) return;
    if (!currentUser) {
      (async () => {
        try {
          const token = await getToken?.({ template: 'convex' });
          if (!token) return;
          didUpsertRef.current = true;
          await upsertUser({ role: 'STUDENT' });
        } catch {}
      })();
    }
  }, [isLoaded, isSignedIn, currentUser, upsertUser]);
  const effectiveUserId = (currentUser?._id as Id<'users'> | undefined);

  // Get student's enrolled sections
  const enrollments = useQuery(
    api.functions.enrollments.getByStudent,
    effectiveUserId ? { studentId: effectiveUserId } : "skip"
  );
  
  // Get sections data
  const sectionsData = useQuery(api.functions.sections.list);
  
  // Combine enrollments with sections data
  const sections = useMemo(() => {
    if (!enrollments || !sectionsData) return [];
    return enrollments.map((enrollment: any) => {
      const section = sectionsData.find((s: any) => s._id === (enrollment as any).sectionId);
      return section ? {
        id: section._id,
        title: section.title,
        gradient: section.gradient || 'gradient-1'
      } : null;
    }).filter(Boolean) as Section[];
  }, [enrollments, sectionsData]);

  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Submit when 4 digits are present
  const onCheckin = async () => {
    setConfirmMsg(null);
    setCheckinError(null);
    const code = digits.join('');
    if (!/^[0-9]{4}$/.test(code) || !effectiveUserId || checking) return;
    try {
      setChecking(true);
      
      // Use Convex mutation (server derives student from identity)
      const recordId = await checkInMutation({ attendanceCode: code });
      
      if (recordId) {
        setConfirmMsg(`Checked in successfully!`);
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


  const [answer, setAnswer] = useState('');
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const submittedOnceRef = useRef<boolean>(false);
  const lastSeenRef = useRef<number>(Date.now());

  // Get interactive activity from Convex
  const interactive = useQuery(
    api.functions.students.getActiveInteractive,
    effectiveUserId ? { studentId: effectiveUserId } : "skip"
  );

  // Reset local single-submit state when a new session starts
  useEffect(() => {
    submittedOnceRef.current = false;
    setSubmitMsg(null);
    setAnswer('');
  }, [interactive?.sessionId]);

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [checking, setChecking] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsClient(true);
  }, []);

  // Set student name from Convex data
  useEffect(() => {
    if (currentUser) {
      setStudentName(`${currentUser.firstName} ${currentUser.lastName}`);
      const newId = (currentUser._id as unknown as string) || null;
      setStudentId(newId);
    }
  }, [currentUser]);

  // If we resolved a user by email, cache the fresh ID
  // No longer writing to localStorage; identity is sourced from Clerk/Convex



  // Autosubmit when all 4 digits are present
  useEffect(() => {
    const allFilled = digits.every((d) => /\d/.test(d) && d.length === 1);
    if (allFilled) void onCheckin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  if (!mounted) return null;

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const numbers = pastedData.replace(/\D/g, '').slice(0, 4).split('');
    const newDigits = [...digits];
    numbers.forEach((num, index) => {
      if (index < 4) newDigits[index] = num;
    });
    setDigits(newDigits);
    if (numbers.length === 4) {
      inputRefs[3].current?.focus();
    }
  };

  // Skeleton when missing effective user
  if (!effectiveUserId) {
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-xl font-semibold">Welcome, {studentName ?? ''}!</div>
      </div>

      <Card className="p-6 space-y-3">
        <div className="text-center">
          <div className="font-medium">Attendance</div>
          <div className="text-slate-500 text-sm">Enter the code you see on the board:</div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <HiOutlineUserGroup className="w-10 h-10 text-black" />
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              className="w-12 h-12 text-center text-xl rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-300"
              inputMode="numeric"
              pattern="\\d*"
              maxLength={1}
              value={d}
              placeholder={String(i + 1)}
              disabled={checking}
              onChange={(e) => handleDigitChange(i, e.target.value)}
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
            className="text-blue-500 font-medium hover:underline"
            onClick={() => {
              try {
                const { useRouter } = require('next/navigation');
                const r = useRouter();
                r.push('/my-attendance');
              } catch {
                window.location.href = '/my-attendance';
              }
            }}
          >
            My attendance →
          </button>
        </div>
      </Card>

      <Card className={`relative overflow-hidden ${interactive ? '' : 'p-6'}`}>
        {interactive && (
          <>
            <div className={`pointer-events-none absolute inset-0 ${sections.find(s=>s.id===interactive.sectionId)?.gradient || 'gradient-1'}`} style={{ opacity: 0.3 }} />
            <div className="pointer-events-none absolute inset-0 bg-white/35" />
            <div className="pointer-events-none absolute -inset-[20%] opacity-30 animate-[gradient_drift_14s_linear_infinite]" style={{ background: 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.32), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.32), transparent)' }} />
            <style jsx>{`
              @keyframes gradient_drift {
                0% { transform: translate3d(0,0,0); }
                50% { transform: translate3d(2%, -2%, 0) scale(1.02); }
                100% { transform: translate3d(0,0,0); }
              }
            `}</style>
          </>
        )}
        <div className={interactive ? 'relative z-10 p-6' : ''}>
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
            <div className="flex gap-2 items-center">
              <TextInput
                value={answer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)}
                placeholder="Your word or phrase"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextSibling as HTMLButtonElement | null)?.click?.(); } }}
              />
              <Button
                onClick={async () => {
                  if (!effectiveUserId || !answer.trim()) return;
                  try {
                    await submitWordcloud({ sessionId: (interactive.sessionId as any), studentId: effectiveUserId, text: answer.trim() });
                    setAnswer('');
                    setSubmitMsg('Answer submitted.');
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Failed to submit.';
                    setSubmitMsg(/already|Multiple/i.test(msg) ? 'You already submitted' : 'Submission failed. Try again.');
                  }
                }}
              >Submit</Button>
            </div>
            {/* removed noisy green banner */}
          </div>
        ) : interactive.kind === 'poll' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Poll</div>
              <div className="text-slate-500 text-sm">{(interactive as any).prompt}</div>
            </div>
            <div className="space-y-2">
              {submitMsg ? (
                <div className="rounded-xl bg-white/85 backdrop-blur border border-slate-200 p-4 text-center text-slate-800 shadow-soft">
                  Thanks! Your response was received.
                </div>
              ) : (
                (interactive as any).options.map((opt: string, i: number) => (
                  <Button key={i} className="w-full justify-start"
                    onClick={async () => {
                      if (!effectiveUserId) return;
                      try {
                        await submitPoll({ sessionId: (interactive as any).sessionId, studentId: effectiveUserId, optionIdx: i });
                        setSubmitMsg('Response submitted');
                      } catch (e) {
                        setSubmitMsg('Response submitted');
                      }
                    }}
                  >{opt}</Button>
                ))
              )}
            </div>
            {submitMsg && (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-center w-full">{submitMsg}</div>
            )}
          </div>
        ) : interactive.kind === 'slideshow' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Activities</div>
              <div className="text-slate-500 text-sm">Your instructor is presenting a slideshow.</div>
            </div>
            {(interactive as any).showOnDevices ? (
              <Button className="w-full" onClick={() => { window.location.href = `/slideshow/view/${(interactive as any).sessionId}`; }}>View Slides Live →</Button>
            ) : (
              <div className="text-slate-600 text-sm text-center">Viewing on your device is disabled.</div>
            )}
          </div>
        ) : null}
        </div>
      </Card>

      <div className="text-slate-600 text-sm">My courses</div>
      {!enrollments || !sectionsData ? (
        <div className="text-center text-slate-600">Loading sections...</div>
      ) : error ? (
        <div className="text-center text-red-600">{error}</div>
      ) : sections.length === 0 ? (
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
                  {isCheckedIn && (
                    <div className="absolute top-2 right-2 z-20 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg ring-1 ring-black/40 inline-flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L9 13.414l4.707-4.707z"/></svg>
                      Checked in
                    </div>
                  )}
                  <div className="relative z-10 text-center">
                    <div className="font-futuristic font-bold text-lg leading-tight px-2">{s.title}</div>
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
