"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, TextInput, Skeleton, Modal } from '@flamelink/ui';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@clerk/nextjs';

type Section = {
  id: string;
  title: string;
  gradient: string;
};

export default function SectionsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);

  // Convex hooks
  const checkInMutation = useMutation(api.functions.attendance.checkIn);
  const submitWordcloud = useMutation(api.functions.wordcloud.submitAnswer);
  const submitPoll = useMutation(api.functions.polls.submitAnswer);
  
  // Get current user from Convex based on Clerk identity
  const currentUser = useQuery(api.functions.auth.getCurrentUser);
  const { isLoaded, isSignedIn } = useAuth();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const didUpsertRef = useRef(false);
  useEffect(() => {
    if (didUpsertRef.current) return;
    if (!isLoaded || !isSignedIn) return;
    if (currentUser === undefined) return;
    if (!currentUser) {
      (async () => {
        try {
          didUpsertRef.current = true;
          await upsertUser({ role: 'STUDENT' });
        } catch (e) {
          // Best-effort upsert; ignore failures in UI but log for debugging
          console.error(e);
        }
      })();
    }
  }, [isLoaded, isSignedIn, currentUser, upsertUser]);
  const effectiveUserId = (currentUser?._id as Id<'users'> | undefined);

  // Get student's enrolled sections
  const enrollments = useQuery(
    api.functions.enrollments.getByStudent,
    effectiveUserId ? { studentId: effectiveUserId } : "skip"
  );
  
  // Get sections data (authorized) for the student's enrollments only
  const sectionIds = useMemo(() => {
    if (!enrollments) return null as Id<'sections'>[] | null;
    return enrollments.map((e: { sectionId: Id<'sections'> }) => e.sectionId as Id<'sections'>);
  }, [enrollments]);
  const sectionsData = useQuery(
    api.functions.sections.getByIds,
    sectionIds && sectionIds.length > 0 ? { ids: sectionIds } : "skip"
  );
  
  // Shape sections for display
  const sections = useMemo(() => {
    if (!sectionsData) return [];
    return sectionsData.map((section: { _id: string; title: string; gradient?: string }) => ({
      id: section._id,
      title: section.title,
      gradient: section.gradient || 'gradient-1'
    })) as Section[];
  }, [sectionsData]);

  const input0Ref = useRef<HTMLInputElement>(null);
  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);
  const input3Ref = useRef<HTMLInputElement>(null);
  const inputRefs = [input0Ref, input1Ref, input2Ref, input3Ref];

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  useEffect(() => { checkingRef.current = checking; }, [checking]);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  // Submit when 4 digits are present
  const onCheckin = useCallback(async (code: string) => {
    setConfirmMsg(null);
    setCheckinError(null);
    if (!/^[0-9]{4}$/.test(code) || !effectiveUserId || checkingRef.current) return;
    try {
      setChecking(true);
      
      // Use Convex mutation (server derives student from identity)
      const result: unknown = await checkInMutation({ attendanceCode: code });
      if (result && typeof result === 'object' && result !== null && 'ok' in result) {
        const r = result as { ok: boolean; error?: string; attemptsLeft?: number; blockedUntil?: number };
        if (r.ok) {
          setConfirmMsg(`Checked in successfully!`);
          setDigits(['', '', '', '']);
          input0Ref.current?.focus();
          setBlockedUntil(null);
        } else {
          const msg = r.error || 'Failed to check in.';
          if (/already checked in/i.test(msg)) {
            setConfirmMsg('You already checked in for this class.');
            setCheckinError(null);
          } else {
            if (typeof r.blockedUntil === 'number') {
              setCheckinError(null);
            } else {
              setCheckinError(msg);
            }
          }
          if (typeof r.blockedUntil === 'number') setBlockedUntil(r.blockedUntil);
        }
      } else if (typeof result === 'string') {
        // Back-compat: server returned a recordId string
        setConfirmMsg(`Checked in successfully!`);
        setDigits(['', '', '', '']);
        input0Ref.current?.focus();
        setBlockedUntil(null);
      } else {
        setCheckinError('Failed to check in. Please try again.');
      }
    } catch (e: unknown) {
      let msgFromServer: string | undefined;
      if (typeof e === 'object' && e !== null) {
        const data = (e as Record<string, unknown>).data;
        if (typeof data === 'string') {
          msgFromServer = data;
        } else if ('message' in e && typeof (e as { message?: unknown }).message === 'string') {
          msgFromServer = (e as { message: string }).message;
        }
      }
      const msg = msgFromServer && msgFromServer.length > 0 ? msgFromServer : 'Failed to check in.';
      // Special-case friendly copy for already checked in
      if (/already checked in/i.test(msg)) {
        setConfirmMsg('You already checked in for this class.');
        setCheckinError(null);
      } else {
        setCheckinError(msg);
      }
    } finally {
      setChecking(false);
    }
  }, [effectiveUserId, checkInMutation]);

  // Inline check-in widget state (must be declared before any returns)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  // Join Code modal state
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinByCode = useMutation(api.functions.enrollments.joinByCode);
  const handleJoinSubmit = useCallback(async (code: string) => {
    if (!/^[0-9]{6}$/.test(code)) {
      setJoinError('Enter a 6-digit join code.');
      return;
    }
    try {
      const res = await joinByCode({ code });
      if (res && typeof res === 'object' && (res as { ok?: boolean }).ok) {
        setJoinOpen(false);
        setJoinCode('');
        setJoinError(null);
      } else if (res && typeof res === 'object' && (res as { error?: unknown }).error) {
        const errVal = (res as { error?: unknown }).error;
        setJoinError(typeof errVal === 'string' ? errVal : 'Failed to join. Try again.');
      } else {
        setJoinError('Failed to join. Try again.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join.';
      setJoinError(/no course/i.test(msg) ? 'No course matches that join code.' : 'Failed to join. Try again.');
    }
  }, [joinByCode]);

  // Get interactive activity from Convex
  // Include a periodic tick to re-evaluate time-based staleness (heartbeat expiry)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);
  const interactive = useQuery(
    api.functions.students.getActiveInteractive,
    effectiveUserId ? { studentId: effectiveUserId, tick } : "skip"
  );

  // Smooth flicker: preserve last non-undefined value; delay clearing null briefly
  const [renderInteractive, setRenderInteractive] = useState<
    | null
    | undefined
    | { kind: 'wordcloud'; sessionId: string; sectionId?: string; prompt?: string; showPromptToStudents?: boolean; allowMultipleAnswers?: boolean; hasSubmitted?: boolean }
    | { kind: 'poll'; sessionId: string; sectionId?: string; prompt?: string; options: string[]; hasSubmitted?: boolean }
    | { kind: 'slideshow'; sessionId: string; sectionId?: string; showOnDevices?: boolean }
    | { kind: 'bible'; sessionId: string; sectionId?: string; reference?: string; translationId?: string; translationName?: string; text?: string }
  >(undefined);
  useEffect(() => {
    // Keep current UI while refetching
    if (interactive === undefined) return;
    // Delay clearing to avoid brief nulls during revalidation
    if (interactive === null) {
      const id = window.setTimeout(() => setRenderInteractive(null), 2000);
      return () => window.clearTimeout(id);
    }
    // Coerce Convex payload to local UI type
    const anyInt = interactive as Record<string, unknown> | null;
    if (anyInt && typeof anyInt === 'object') {
      if (anyInt['kind'] === 'wordcloud') {
        setRenderInteractive({
          kind: 'wordcloud',
          sessionId: String(anyInt['sessionId']),
          sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
          prompt: typeof anyInt['prompt'] === 'string' ? (anyInt['prompt'] as string) : undefined,
          showPromptToStudents: typeof anyInt['showPromptToStudents'] === 'boolean' ? (anyInt['showPromptToStudents'] as boolean) : undefined,
          allowMultipleAnswers: typeof anyInt['allowMultipleAnswers'] === 'boolean' ? (anyInt['allowMultipleAnswers'] as boolean) : undefined,
          hasSubmitted: typeof anyInt['hasSubmitted'] === 'boolean' ? (anyInt['hasSubmitted'] as boolean) : undefined,
        });
        return;
      }
      if (anyInt['kind'] === 'poll') {
        setRenderInteractive({
          kind: 'poll',
          sessionId: String(anyInt['sessionId']),
          sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
          prompt: typeof anyInt['prompt'] === 'string' ? (anyInt['prompt'] as string) : undefined,
          options: Array.isArray(anyInt['options']) ? (anyInt['options'] as unknown[]).map((o: unknown) => String(o)) : [],
          hasSubmitted: typeof anyInt['hasSubmitted'] === 'boolean' ? (anyInt['hasSubmitted'] as boolean) : undefined,
        });
        return;
      }
      if (anyInt['kind'] === 'slideshow') {
        setRenderInteractive({
          kind: 'slideshow',
          sessionId: String(anyInt['sessionId']),
          sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
          showOnDevices: typeof anyInt['showOnDevices'] === 'boolean' ? (anyInt['showOnDevices'] as boolean) : undefined,
        });
        return;
      }
      if (anyInt['kind'] === 'bible') {
        setRenderInteractive({
          kind: 'bible',
          sessionId: String(anyInt['sessionId']),
          sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
          reference: typeof anyInt['reference'] === 'string' ? (anyInt['reference'] as string) : undefined,
          translationId: typeof anyInt['translationId'] === 'string' ? (anyInt['translationId'] as string) : undefined,
          translationName: typeof anyInt['translationName'] === 'string' ? (anyInt['translationName'] as string) : undefined,
          text: typeof anyInt['text'] === 'string' ? (anyInt['text'] as string) : undefined,
        });
        return;
      }
    }
    // Unknown shape
    setRenderInteractive(undefined);
  }, [interactive]);

  // Reset local single-submit state when a new session starts
  useEffect(() => {
    setSubmitMsg(null);
    setAnswer('');
  }, [renderInteractive?.sessionId]);

  

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dev utility: listen for a reset event to clear local blocked state
  useEffect(() => {
    function handleReset() {
      setBlockedUntil(null);
    }
    window.addEventListener('dev:reset-checkin-rate-limit', handleReset as EventListener);
    return () => window.removeEventListener('dev:reset-checkin-rate-limit', handleReset as EventListener);
  }, []);

  // Set student name from Convex data
  useEffect(() => {
    if (currentUser) {
      setStudentName(`${currentUser.firstName} ${currentUser.lastName}`);
    }
  }, [currentUser]);

  // If we resolved a user by email, cache the fresh ID
  // No longer writing to localStorage; identity is sourced from Clerk/Convex



  // Autosubmit when all 4 digits are present
  const lastSubmittedRef = useRef<string | null>(null);
  useEffect(() => {
    const allFilled = digits.every((d) => /\d/.test(d) && d.length === 1);
    if (!allFilled) return;
    const code = digits.join('');
    if (code === lastSubmittedRef.current) return;
    lastSubmittedRef.current = code;
    void onCheckin(code);
  }, [digits, onCheckin]);

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
          <div className="text-neutral-600 dark:text-neutral-400 text-sm">Enter the code you see on the board:</div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <HiOutlineUserGroup className="w-10 h-10 text-slate-900 dark:text-slate-100" />
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              className={`w-12 h-12 text-center text-xl rounded-xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ${ ((blockedUntil !== null && blockedUntil > Date.now()) || checking) ? 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-700' : 'bg-white text-neutral-900 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700' }`}
              inputMode="numeric"
              pattern="\\d*"
              maxLength={1}
              value={d}
              placeholder={String(i + 1)}
              disabled={checking || (blockedUntil !== null && blockedUntil > Date.now())}
              onChange={(e) => {
                // On any user input, allow resubmitting a new code
                lastSubmittedRef.current = null;
                handleDigitChange(i, e.target.value);
              }}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
            />
          ))}
        </div>
        {blockedUntil && blockedUntil > Date.now() && (
          <BlockedBanner blockedUntil={blockedUntil} onUnblock={() => { setBlockedUntil(null); lastSubmittedRef.current = null; }} />
        )}
        {confirmMsg && (
          <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 dark:text-green-200 dark:bg-green-900/30 dark:border-green-800">{confirmMsg}</div>
        )}
        {checkinError && (!(blockedUntil && blockedUntil > Date.now())) && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 dark:text-red-200 dark:bg-red-900/30 dark:border-red-800">{checkinError}</div>
        )}
        <div className="flex items-center justify-center">
          <button
            className="text-blue-500 dark:text-blue-400 font-medium hover:underline"
            onClick={() => {
              router.push('/my-attendance');
            }}
          >
            My attendance →
          </button>
        </div>
      </Card>

      <Card className={`relative overflow-hidden ${renderInteractive ? '' : 'p-6'}`}>
        {renderInteractive && (
          <>
            <div className={`pointer-events-none absolute inset-0 ${sections.find(s=>s.id===renderInteractive.sectionId)?.gradient || 'gradient-1'}`} style={{ opacity: 0.3 }} />
            <div className="pointer-events-none absolute inset-0 bg-white/35 dark:bg-neutral-900/50" />
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
        <div className={renderInteractive ? 'relative z-10 p-6' : ''}>
        {!renderInteractive ? (
          <div className="border-2 border-dashed rounded-xl p-6 text-center text-slate-600 dark:text-slate-300 border-slate-200 dark:border-neutral-700">
            <div className="font-medium mb-1">Activities</div>
            <div className="text-sm">Your instructors have not started any live activites yet...</div>
            <div className="mt-3 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-[pulse_1.2s_0.2s_ease-in-out_infinite]" />
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-[pulse_1.2s_0.4s_ease-in-out_infinite]" />
            </div>
          </div>
        ) : renderInteractive.kind === 'wordcloud' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Word Cloud</div>
              {Boolean((renderInteractive as unknown as { showPromptToStudents?: boolean }).showPromptToStudents) && (
                <div className="text-slate-500 text-sm">{String((renderInteractive as unknown as { prompt?: string }).prompt || '')}</div>
              )}
            </div>
              {(
              // If multiple answers are NOT allowed and either server says submitted or we just submitted
              (((renderInteractive as unknown as { allowMultipleAnswers?: boolean }).allowMultipleAnswers === false) && (((renderInteractive as unknown as { hasSubmitted?: boolean }).hasSubmitted || false) || !!submitMsg))
            ) ? (
              <div className="rounded-xl bg-white/85 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 p-4 text-center text-slate-800 dark:text-slate-100 shadow-soft">
                Thanks! Your response was received.
              </div>
            ) : (
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
                      await submitWordcloud({ sessionId: (renderInteractive.sessionId as Id<'wordCloudSessions'>), text: answer.trim() });
                      setAnswer('');
                      setSubmitMsg('Answer submitted.');
                    } catch (e: unknown) {
                      const msg = e instanceof Error ? e.message : 'Failed to submit.';
                      setSubmitMsg(/already|Multiple/i.test(msg) ? 'You already submitted' : 'Submission failed. Try again.');
                    }
                  }}
                >Submit</Button>
              </div>
            )}
            {/* removed noisy green banner */}
          </div>
        ) : renderInteractive.kind === 'poll' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Poll</div>
              <div className="text-slate-500 text-sm">{String((renderInteractive as unknown as { prompt?: string }).prompt || '')}</div>
            </div>
            <div className="space-y-2">
              {(((renderInteractive as unknown as { hasSubmitted?: boolean }).hasSubmitted || false) || !!submitMsg) ? (
                <div className="rounded-xl bg-white/85 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-700 p-4 text-center text-slate-800 dark:text-slate-100 shadow-soft">
                  Thanks! Your response was received.
                </div>
              ) : (
                (renderInteractive as unknown as { options: string[] }).options.map((opt: string, i: number) => (
                  <Button key={i} className="w-full justify-start"
                    onClick={async () => {
                      if (!effectiveUserId) return;
                      try {
                        await submitPoll({ sessionId: renderInteractive.sessionId as Id<'pollSessions'>, optionIdx: i });
                        setSubmitMsg('Response submitted');
                      } catch {
                        setSubmitMsg('Response submitted');
                      }
                    }}
                  >{opt}</Button>
                ))
              )}
            </div>
            {submitMsg && (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-center w-full dark:text-green-200 dark:bg-green-900/30 dark:border-green-800">{submitMsg}</div>
            )}
          </div>
        ) : renderInteractive.kind === 'slideshow' ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="font-medium">Activities</div>
              <div className="text-slate-500 text-sm">Your instructor is presenting a slideshow.</div>
            </div>
            {((renderInteractive as unknown as { showOnDevices?: boolean }).showOnDevices ?? false) ? (
              <Button className="w-full" onClick={() => { window.location.href = `/slideshow/view/${renderInteractive.sessionId}`; }}>View Slides Live →</Button>
            ) : (
              <div className="text-slate-600 text-sm text-center">Viewing on your device is disabled.</div>
            )}
          </div>
        ) : renderInteractive.kind === 'bible' ? (
          <BibleStudentWidget interactive={renderInteractive} />
        ) : null}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-slate-600 dark:text-slate-300 text-sm">My courses</div>
        <button className="text-blue-500 text-sm font-medium hover:underline" onClick={() => { setJoinOpen(true); setJoinCode(''); setJoinError(null); }}>+ Enter Join Code</button>
      </div>
      {!enrollments || !sectionsData ? (
        <div className="text-center text-slate-600">Loading sections...</div>
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
            return (
              <Card key={s.id} className="p-3 sm:p-4 flex flex-col overflow-hidden group">
                <div className={`aspect-[3/2] rounded-lg ${gradientClass} mb-3 sm:mb-4 text-white relative overflow-hidden grid place-items-center`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative z-10 text-center">
                    <div className="font-bold text-lg leading-tight px-2">{s.title}</div>
                  </div>
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white/20 rounded-full"></div>
                  <div className="absolute bottom-2 right-2 w-2 h-2 bg-white/30 rounded-full"></div>
                </div>
                <div className="font-medium mb-2 text-slate-700 dark:text-slate-200 truncate">{s.title}</div>
              </Card>
            );
          })}
        </div>
      )}

      <JoinCodeModal
        open={joinOpen}
        onClose={() => { setJoinOpen(false); }}
        onSubmit={handleJoinSubmit}
        error={joinError}
        value={joinCode}
        setValue={(v) => { setJoinError(null); setJoinCode(v); }}
      />
    </div>
  );
}

function BlockedBanner({ blockedUntil, onUnblock }: { blockedUntil: number; onUnblock: () => void }) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remainingMs = Math.max(0, blockedUntil - now);
  useEffect(() => {
    if (remainingMs <= 0) onUnblock();
  }, [remainingMs, onUnblock]);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return (
    <div className="mt-3 w-full rounded-lg bg-amber-50 border border-amber-200 text-amber-900 p-2 text-sm text-center">
      Too many attempts. Try again in {mm}:{ss} or ask your instructor to mark your attendance manually.
    </div>
  );
}

function JoinCodeModal({ open, onClose, onSubmit, error, value, setValue }: { open: boolean; onClose: () => void; onSubmit: (code: string) => void; error: string | null; value: string; setValue: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [open]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    setValue(raw);
    if (raw.length === 6) onSubmit(raw);
  };
  return (
    <Modal open={open} onClose={onClose}>
      <Card className="p-5 w-[92vw] max-w-sm">
        <div className="text-center mb-3">
          <div className="font-medium">Enter Join Code</div>
          <div className="text-slate-500 text-sm">Ask your instructor for the 6-digit code.</div>
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <TextInput
            ref={inputRef}
            inputMode="numeric"
            pattern="\\d*"
            placeholder="000000"
            value={value}
            onChange={handleChange}
            className="text-center tracking-widest tabular-nums"
            aria-invalid={!!error}
            aria-describedby={error ? 'join-error' : undefined}
          />
        </div>
        {error && (
          <div id="join-error" className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-center">
            {error}
          </div>
        )}
      </Card>
    </Modal>
  );
}

function BibleStudentWidget({
  interactive,
}: {
  interactive: {
    kind: 'bible';
    sessionId: string;
    sectionId?: string;
    reference?: string;
    translationId?: string;
    translationName?: string;
    text?: string;
  };
}) {
  const reference = interactive.reference || '';
  const translationName = interactive.translationName || '';
  const text = (interactive.text || '').trim();
  const [showFull, setShowFull] = useState(false);

  const isLong = text.length > 220;

  const externalUrl = (() => {
    const base = 'https://www.biblegateway.com/passage/';
    const params = new URLSearchParams();
    const ref = (reference || '').trim();
    const idx = ref.indexOf(':');
    const chapterRef = idx === -1 ? ref : ref.slice(0, idx);
    params.set('search', chapterRef);
    const version = (interactive.translationId || '').toLowerCase() === 'kjv' ? 'KJV' : 'WEB';
    params.set('version', version);
    return `${base}?${params.toString()}`;
  })();

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-left">
            <div className="font-medium">Bible Passage</div>
            {reference && (
              <div className="text-neutral-600 dark:text-neutral-300 text-sm mt-0.5">
                {reference}
                {translationName ? ` · ${translationName}` : null}
              </div>
            )}
          </div>
          <button
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
          >
            Full passage on Bible Gateway →
          </button>
        </div>
        <div className="relative mt-2">
          <div
            className={`
              text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap
              ${isLong ? 'max-h-24 overflow-hidden' : ''}
            `}
          >
            {text || 'Passage loading…'}
          </div>
          {isLong && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white dark:from-neutral-900 to-transparent flex justify-end items-end pr-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">…</span>
            </div>
          )}
        </div>
        {isLong && (
          <div className="flex justify-end">
            <Button variant="ghost" className="text-xs px-2 py-1 h-7" onClick={() => setShowFull(true)}>
              More
            </Button>
          </div>
        )}
      </div>

      <Modal open={showFull} onClose={() => setShowFull(false)}>
        <Card className="p-5 w-[min(92vw,32rem)] max-h-[80vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="font-medium mb-0.5">Bible Passage</div>
              {reference && (
                <div className="text-neutral-600 dark:text-neutral-300 text-sm">
                  {reference}
                  {translationName ? ` · ${translationName}` : null}
                </div>
              )}
            </div>
            <button
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
            >
              Full passage on Bible Gateway →
            </button>
          </div>
          <div className="text-sm leading-relaxed text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
            {text || 'Passage loading…'}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" className="text-xs px-3 py-1 h-8" onClick={() => setShowFull(false)}>
              Close
            </Button>
          </div>
        </Card>
      </Modal>
    </>
  );
}
