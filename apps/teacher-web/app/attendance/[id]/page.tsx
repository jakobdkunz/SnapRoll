"use client";
import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, Button, Skeleton } from '@snaproll/ui';
import { HiOutlineArrowPath, HiOutlineArrowLeft, HiOutlineGlobeAlt, HiOutlineDevicePhoneMobile, HiOutlineUserGroup } from 'react-icons/hi2';
import React from 'react';
import { apiFetch } from '@snaproll/api-client';
import { useParams, useRouter } from 'next/navigation';

type ClassDay = { id: string; attendanceCode: string };
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
  const [code, setCode] = useState<string>('....');
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [animatingCount, setAnimatingCount] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const isStartingRef = useRef(false);
  const prevCodeRef = useRef<string | null>(null);
  const startedOnLoadRef = useRef(false);
  const [codePulse, setCodePulse] = useState(false);
  const [sectionGradient, setSectionGradient] = useState<string>('gradient-1');
  const [sectionTitle, setSectionTitle] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch<AttendanceStatus>(`/api/sections/${params.id}/attendance-status`);
      setStatus(data);
      if (data.attendanceCode && data.attendanceCode !== prevCodeRef.current) {
        prevCodeRef.current = data.attendanceCode;
        setCode(data.attendanceCode);
      }
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  }, [params.id]);

  const start = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setIsStarting(true);
    try {
      const data = await apiFetch<{ classDay: ClassDay }>(
        `/api/sections/${params.id}/start-attendance`,
        { method: 'POST' }
      );
      prevCodeRef.current = data.classDay.attendanceCode;
      setCode(data.classDay.attendanceCode);
      await loadStatus();
    } catch (e) {
      console.error('Failed to start attendance:', e);
    } finally {
      isStartingRef.current = false;
      setIsStarting(false);
    }
  }, [params.id, loadStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    // If there is no active attendance or no code yet, start immediately (once)
    if (status && (!status.hasActiveAttendance || !status.attendanceCode) && !startedOnLoadRef.current) {
      startedOnLoadRef.current = true;
      void start();
    }
  }, [status, start]);

  useEffect(() => {
    // Briefly pulse the code when it changes
    if (prevCodeRef.current) {
      setCodePulse(true);
      const t = window.setTimeout(() => setCodePulse(false), 220);
      return () => window.clearTimeout(t);
    }
  }, [code]);

  useEffect(() => {
    if (status?.hasActiveAttendance) {
      const interval = setInterval(loadStatus, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [status?.hasActiveAttendance, loadStatus]);

  // Load section gradient and title for background/header
  useEffect(() => {
    async function loadSection() {
      try {
        const res = await apiFetch<{ section: { gradient: string; title: string } }>(`/api/sections/${params.id}`);
        if (res?.section?.gradient) setSectionGradient(res.section.gradient);
        if (res?.section?.title) setSectionTitle(res.section.title);
      } catch (_err) {
        // ignore, fallback stays
      }
    }
    loadSection();
  }, [params.id]);

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
    <div ref={containerRef} className="relative" style={{ height: 'calc(100vh - 80px - 48px)' }}>
      {/* Animated, washed-out section gradient background */}
      <div className={`pointer-events-none fixed inset-0 ${sectionGradient}`} style={{ opacity: 0.3 }} />
      <div className="pointer-events-none fixed inset-0 bg-white/35" />
      <div className="pointer-events-none fixed -inset-[20%] opacity-30 animate-[gradient_drift_14s_linear_infinite]" style={{ background: 'radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.32), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.32), transparent)' }} />
      <style jsx>{`
        @keyframes gradient_drift {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(2%, -2%, 0) scale(1.02); }
          100% { transform: translate3d(0,0,0); }
        }
      `}</style>
      <div className="relative z-10 flex flex-col h-screen">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" className="inline-flex items-center gap-2" onClick={() => router.back()}>
            <HiOutlineArrowLeft className="h-5 w-5" /> Back
          </Button>
          <div className="mx-auto text-center">
            <div className="text-lg font-semibold truncate max-w-[80vw]">{sectionTitle || 'Section'}</div>
          </div>
          <div className="w-[88px]" />
        </div>
        
        {/* Attendance Code Widget - Top */}
        <div className="mb-6">
          <Card className="p-6 sm:p-10 text-center bg-white/80 backdrop-blur">
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
                      <HiOutlineUserGroup className="w-24 h-24 text-black flex-shrink-0 mr-6 sm:mr-8" />
                      <div className="flex gap-3 sm:gap-4">
                        {code.split('').map((ch, i) => (
                          <div key={i} className="rounded-2xl bg-white shadow-soft px-4 sm:px-6 py-3 sm:py-5 tabular-nums font-extrabold text-[3.5rem] sm:text-[5rem] leading-none">
                            {ch}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-slate-600 text-base flex items-center justify-center gap-6">
                  <span className="inline-flex items-center gap-2"><HiOutlineGlobeAlt className="h-6 w-6" /> Enter at <span className="font-medium">SnapRoll.org</span></span>
                  <span className="inline-flex items-center gap-2"><HiOutlineDevicePhoneMobile className="h-6 w-6" /> or use the SnapRoll app</span>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Progress Bar Widget - Top */}
        <div className="mb-6 flex justify-center">
          <Card className="p-6 w-full max-w-3xl bg-white/80 backdrop-blur">
            {status ? (
              <>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-primary">
                    {status.checkedIn}/{status.totalStudents}
                  </div>
                  <div className="text-sm text-slate-500">students checked in</div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-5 mb-1">
                  <div 
                    className="bg-primary h-5 rounded-full transition-all duration-300"
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

        {/* Generate new code button - Top */}
        <div className="flex justify-center">
          <Button className="inline-flex items-center gap-2 shadow-soft" onClick={start} disabled={isStarting}>
            <HiOutlineArrowPath className="h-5 w-5" /> {isStarting ? 'Generating…' : 'Generate New Code'}
          </Button>
        </div>
      </div>
    </div>
  );
}
