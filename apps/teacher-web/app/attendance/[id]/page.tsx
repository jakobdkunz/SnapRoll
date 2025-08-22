"use client";
import { useEffect, useState } from 'react';
import { Card, Button } from '@snaproll/ui';
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

  async function start() {
    const data = await apiFetch<{ classDay: ClassDay }>(
      `/api/sections/${params.id}/start-attendance`,
      { method: 'POST' }
    );
    setCode(data.classDay.attendanceCode);
    loadStatus();
  }

  async function loadStatus() {
    try {
      const data = await apiFetch<AttendanceStatus>(`/api/sections/${params.id}/attendance-status`);
      setStatus(data);
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    }
  }

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (status?.hasActiveAttendance) {
      const interval = setInterval(loadStatus, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [status?.hasActiveAttendance]);

  return (
    <div className="grid place-items-center space-y-6">
      <Card className="p-10 text-center">
        <div className="text-sm uppercase tracking-wide text-slate-500">Attendance Code</div>
        <div className="mt-2 text-6xl font-bold tracking-widest">{code}</div>
        <Button className="mt-6" onClick={start}>Generate New Code</Button>
      </Card>

      {status && status.hasActiveAttendance && (
        <Card className="p-6 w-full max-w-md">
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
        </Card>
      )}
    </div>
  );
}
