"use client";
import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Skeleton } from '@snaproll/ui';
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

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch<AttendanceStatus>(`/api/sections/${params.id}/attendance-status`);
      setStatus(data);
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  }, [params.id]);

  const start = useCallback(async () => {
    const data = await apiFetch<{ classDay: ClassDay }>(
      `/api/sections/${params.id}/start-attendance`,
      { method: 'POST' }
    );
    setCode(data.classDay.attendanceCode);
    loadStatus();
  }, [params.id, loadStatus]);

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
            <div className="mt-2 text-6xl font-bold tracking-widest">{code}</div>
            <Button className="mt-6" onClick={start}>Generate New Code</Button>
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
