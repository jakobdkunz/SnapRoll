"use client";
import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, Button, Skeleton, TextInput } from '@flamelink/ui';
import { HiOutlineArrowPath, HiOutlineArrowLeft, HiOutlineGlobeAlt, HiOutlineDevicePhoneMobile, HiOutlineUserGroup } from 'react-icons/hi2';
import React from 'react';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

type AttendanceStatus = {
  hasActiveAttendance: boolean;
  totalStudents: number;
  checkedIn: number;
  progress: number;
  attendanceCode: string | null;
};

export default function AttendancePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const isAuthReady = isLoaded && isSignedIn;
  const [code, setCode] = useState<string>('....');
  const [status, setStatus] = useState<AttendanceStatus | null>(null);

  // Convex hooks
  const startAttendance = useMutation(api.functions.attendance.startAttendance);
  const startAttendanceForDate = useMutation(api.functions.attendance.startAttendanceForDate);
  const sectionId = (params.id as unknown) as Id<'sections'>;
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const devMode = (process.env.NEXT_PUBLIC_DEV_MODE ?? "false") === "true";

  // Convert YYYY-MM-DD to an epoch that safely maps to the intended ET day
  const selectedEpochMs = (() => {
    if (!selectedDate) return undefined;
    const [y, m, d] = selectedDate.split('-').map((s) => Number(s));
    if (!y || !m || !d) return undefined;
    // Use 12:00 UTC to avoid DST/zone edge cases; server normalizes to ET midnight
    return Date.UTC(y, m - 1, d, 12, 0, 0, 0);
  })();

  const getAttendanceStatus = useQuery(
    api.functions.attendance.getAttendanceStatus,
    isAuthReady && params.id ? (devMode && selectedEpochMs ? { sectionId, date: selectedEpochMs } : { sectionId }) : "skip"
  );
  const section = useQuery(
    api.functions.sections.get,
    isAuthReady && params.id ? { id: sectionId } : "skip"
  );

  const [isStarting, setIsStarting] = useState(false);
  const isStartingRef = useRef(false);
  const prevCodeRef = useRef<string | null>(null);
  const startedOnLoadRef = useRef(false);
  const [codePulse, setCodePulse] = useState(false);
  const [sectionGradient, setSectionGradient] = useState<string>('gradient-1');
  const [sectionTitle, setSectionTitle] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      if (getAttendanceStatus) {
        setStatus(getAttendanceStatus);
        if (getAttendanceStatus.attendanceCode && getAttendanceStatus.attendanceCode !== prevCodeRef.current) {
          prevCodeRef.current = getAttendanceStatus.attendanceCode;
          setCode(getAttendanceStatus.attendanceCode);
        }
      }
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  }, [getAttendanceStatus]);

  const start = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setIsStarting(true);
    try {
      const classDayId = devMode && selectedEpochMs
        ? await startAttendanceForDate({ sectionId, date: selectedEpochMs })
        : await startAttendance({ sectionId });
      if (classDayId) {
        // The attendance status will be updated via the Convex query
        await loadStatus();
      }
    } catch (e) {
      console.error('Failed to start attendance:', e);
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }, [sectionId, loadStatus, startAttendance, startAttendanceForDate, devMode, selectedEpochMs]);

  useEffect(() => {
    if (getAttendanceStatus) {
      setStatus(getAttendanceStatus);
      if (getAttendanceStatus.attendanceCode && getAttendanceStatus.attendanceCode !== prevCodeRef.current) {
        prevCodeRef.current = getAttendanceStatus.attendanceCode;
        setCode(getAttendanceStatus.attendanceCode);
      }
    }
  }, [getAttendanceStatus]);

  useEffect(() => {
    // In dev mode with a selected date, avoid auto-starting to let user control the day
    if (devMode) return;
    // If there is no active attendance or no code yet, start immediately (once)
    if (status && (!status.hasActiveAttendance || !status.attendanceCode) && !startedOnLoadRef.current) {
      startedOnLoadRef.current = true;
      void start();
    }
  }, [status, start, devMode]);

  useEffect(() => {
    // Briefly pulse the code when it changes
    if (prevCodeRef.current) {
      setCodePulse(true);
      const t = window.setTimeout(() => setCodePulse(false), 220);
      return () => window.clearTimeout(t);
    }
  }, [code]);

  // Remove polling; Convex query is reactive

  // Load section gradient and title for background/header
  useEffect(() => {
    if (section) {
      if (section.gradient) setSectionGradient(section.gradient);
      if (section.title) setSectionTitle(section.title);
      const s = section as { joinCode?: string };
      if (typeof s.joinCode === 'string' && s.joinCode.length > 0) setJoinCode(s.joinCode);
    }
  }, [section]);

  // At local midnight, automatically start a new attendance day and reset progress
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
        await start();
        // schedule again for the following midnight
        schedule();
      }, ms + 100);
    }
    schedule();
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [params.id, start]);



  return (
    <div ref={containerRef} className="relative" style={{ height: 'calc(100vh - 120px - 80px)' }}>
      {/* Animated, washed-out section gradient background */}
      <div className={`pointer-events-none fixed inset-0 ${sectionGradient}`} style={{ opacity: 0.45 }} />
      <div className="pointer-events-none fixed inset-0 bg-white/12 dark:bg-black/30" />
      <div
        className="pointer-events-none fixed -inset-[20%] opacity-30 animate-[gradient_drift_14s_linear_infinite]"
        style={{
          background:
            sectionGradient === 'gradient-1'
              ? 'radial-gradient(40% 60% at 30% 30%, rgba(59,130,246,0.28), transparent), radial-gradient(50% 40% at 70% 60%, rgba(79,70,229,0.22), transparent)'
              : 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.32), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.32), transparent)'
        }}
      />
      <style jsx>{`
        @keyframes gradient_drift {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(2%, -2%, 0) scale(1.02); }
          100% { transform: translate3d(0,0,0); }
        }
      `}</style>
      <div className="relative z-10 flex flex-col h-full">
        <div className="grid grid-cols-[1fr,auto,1fr] items-center mb-6">
          <Button variant="ghost" className="inline-flex items-center gap-2 bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800 text-slate-900 dark:text-neutral-100 border border-slate-200 dark:border-neutral-800 rounded-xl justify-self-start" onClick={() => router.back()}>
            <HiOutlineArrowLeft className="h-5 w-5" /> Back
          </Button>
          <div className="justify-self-center text-center">
            <div className="text-lg font-semibold truncate max-w-[80vw]">{sectionTitle || 'Section'}</div>
          </div>
          <div className="justify-self-end">
            {joinCode && (
              <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-sm text-slate-700 dark:text-neutral-200">
                <span className="uppercase tracking-wide text-slate-500 dark:text-slate-400">Join code</span>
                <span className="tabular-nums font-semibold">{joinCode}</span>
              </div>
            )}
          </div>
        </div>

        {devMode && (
          <div className="mb-4">
            <Card className="p-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="text-sm text-slate-600">Developer day picker</div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-700">Day</label>
                  <TextInput type="date" value={selectedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)} />
                </div>
                <Button onClick={start} disabled={isStarting}>
                  {isStarting ? 'Generating…' : 'Start/Rotate code for day'}
                </Button>
              </div>
            </Card>
          </div>
        )}
        
        {/* Attendance Code Widget - Centered */}
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 sm:p-10 text-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
            <div className="text-sm uppercase tracking-wide text-slate-500">
              Attendance Code
            </div>
            {!status ? (
              <div className="mt-4 grid place-items-center gap-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-10 w-40" />
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center justify-center">
                  <div className={`transition-transform duration-200 ${codePulse ? 'scale-105' : 'scale-100'}`}>
                    <div className="flex items-center">
                      <HiOutlineUserGroup className="w-24 h-24 text-slate-800 dark:text-slate-200 flex-shrink-0 mr-6 sm:mr-8" />
                      <div className="flex gap-3 sm:gap-4">
                        {code.split('').map((ch, i) => (
                          <div key={i} className="rounded-2xl bg-white dark:bg-neutral-800 shadow-soft px-4 sm:px-6 py-3 sm:py-5 tabular-nums font-extrabold text-[3.5rem] sm:text-[5rem] leading-none text-slate-900 dark:text-neutral-100">
                            {ch}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="mt-6 text-slate-600 dark:text-slate-300 text-base flex items-center justify-center gap-6">
                  <span className="inline-flex items-center gap-2">
                    <HiOutlineGlobeAlt className="h-6 w-6" />
                    <span>Enter at&nbsp;<span className="font-medium">FlameLink.org</span></span>
                  </span>
                  <span className="inline-flex items-center gap-2"><HiOutlineDevicePhoneMobile className="h-6 w-6" /> or use the FlameLink app</span>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Progress Bar Widget - Bottom */}
        <div className="mb-20 flex justify-center">
          <Card className="p-6 w-full max-w-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
            {status ? (
              <>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                    {status.checkedIn}/{status.totalStudents}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">students checked in</div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-5 mb-1">
                  <div 
                    className="bg-blue-500 dark:bg-blue-400 h-5 rounded-full transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="mt-2 grid place-items-center gap-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="w-full h-5 rounded-full" />
              </>
            )}
          </Card>
        </div>

        {/* Generate new code button - Fixed Bottom */}
        <div className="fixed bottom-5 left-0 right-0 flex justify-center px-4">
          <Button className="inline-flex items-center gap-2 shadow-soft" onClick={start} disabled={isStarting}>
            <HiOutlineArrowPath className="h-5 w-5" /> {isStarting ? 'Generating…' : 'Generate New Code'}
          </Button>
        </div>
      </div>
    </div>
  );
}
