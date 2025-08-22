"use client";
import { useCallback, useEffect, useState, useRef } from 'react';
import { Card, Button, Skeleton } from '@snaproll/ui';
import React from 'react';
import { apiFetch } from '@snaproll/api-client';
import { useParams } from 'next/navigation';

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
  const [code, setCode] = useState<string>('....');
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [animatingCount, setAnimatingCount] = useState(0);

  const [checking, setChecking] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch<AttendanceStatus>(`/api/sections/${params.id}/attendance-status`);
      setStatus(data);
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  }, [params.id]);

  async function start() {
    const data = await apiFetch<{ classDay: ClassDay }>(
      `/api/sections/${params.id}/start-attendance`,
      { method: 'POST' }
    );
    setCode(data.classDay.attendanceCode);
    loadStatus();
  }

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (status?.hasActiveAttendance) {
      const interval = setInterval(loadStatus, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [status?.hasActiveAttendance, loadStatus]);

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
    <div className="grid place-items-center space-y-6">
      <Card className="p-10 text-center">
        <div className="text-sm uppercase tracking-wide text-slate-500">Attendance Code</div>
        {!status ? (
          <div className="mt-4 grid place-items-center gap-4">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : (
          <>
            <div className="mt-2 flex justify-center gap-2">
              {Array.from(code).map((ch, i) => (
                <DigitReel
                  key={i}
                  index={i}
                  target={ch}
                  onStart={() => setAnimatingCount((c) => c + 1)}
                  onEnd={() => setAnimatingCount((c) => Math.max(0, c - 1))}
                />
              ))}
            </div>
            <Button className="mt-6" onClick={start} disabled={animatingCount > 0}>Generate New Code</Button>
          </>
        )}
      </Card>

      {(!status || status.hasActiveAttendance) && (
        <Card className="p-6 w-full max-w-md">
          {status ? (
            <>
              <div className="text-center mb-4">
                <div className="text-lg font-medium">Attendance Progress</div>
                <div className="text-2xl font-bold text-primary">
                  {status.checkedIn}/{status.totalStudents}
                </div>
                <div className="text-sm text-slate-500">students checked in</div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <div className="text-center text-sm text-slate-600">
                {status.progress}% complete
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className="text-lg font-medium">Attendance Progress</div>
                <div className="mt-2 grid place-items-center gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <Skeleton className="w-full h-3 rounded-full" />
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function DigitReel({ target, index, onStart, onEnd }: { target: string; index: number; onStart: () => void; onEnd: () => void }) {
  const isDigit = /\d/.test(target);
  const [current, setCurrent] = useState<string>(isDigit ? target : '•');
  const [next, setNext] = useState<string>(isDigit ? target : '•');
  const [offset, setOffset] = useState<number>(-100); // start hidden above
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const t = isDigit ? target : '•';
    if (current === '•' && t !== '•') {
      // First real code load: slide in from above once
      setNext(t);
      onStart();
      const delay = index * 60;
      const start = window.setTimeout(() => {
        setOffset(0);
        animRef.current = window.setTimeout(() => {
          setCurrent(t);
          setOffset(0);
          onEnd();
        }, 250);
      }, delay);
      return () => {
        window.clearTimeout(start);
        if (animRef.current) window.clearTimeout(animRef.current);
      };
    }
    if (t !== current) {
      // Regenerate: slide the next value up quickly
      setNext(t);
      onStart();
      const delay = index * 80;
      const start = window.setTimeout(() => {
        setOffset(-100);
        animRef.current = window.setTimeout(() => {
          setCurrent(t);
          setOffset(0);
          onEnd();
        }, 220);
      }, delay);
      return () => {
        window.clearTimeout(start);
        if (animRef.current) window.clearTimeout(animRef.current);
      };
    }
  }, [target]);

  return (
    <div className="w-12 h-16 overflow-hidden rounded-md bg-white/60 shadow-inner border border-slate-200 grid place-items-center">
      <div
        className="will-change-transform"
        style={{
          transform: `translateY(${offset}%)`,
          transition: 'transform 250ms ease-in-out',
        }}
      >
        <div className="h-16 flex items-center justify-center text-5xl font-bold tabular-nums text-slate-900">{next}</div>
        <div className="h-16 flex items-center justify-center text-5xl font-bold tabular-nums text-slate-900">{current}</div>
      </div>
    </div>
  );
}
