"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, TextInput } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';
import { HiOutlineHandRaised } from 'react-icons/hi2';

export default function CheckinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const studentId = typeof window !== 'undefined' ? localStorage.getItem('snaproll.studentId') : null;

  const onSubmit = async () => {
    setError(null);
    setConfirmed(null);
    
    try {
      const res = await apiFetch<{ ok: boolean; status: string }>(
        '/api/attendance/checkin',
        { method: 'POST', body: JSON.stringify({ code, studentId }) }
      );
      if (res.ok) {
        setConfirmed(code);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Check-in failed';
      setError(errorMessage);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/sections')}>← Back to Courses</Button>
        <div className="font-medium">Attendance Check-in</div>
      </div>
      
      <Card className="p-6 space-y-3">
        <div className="font-medium flex items-center gap-2">
          Enter Attendance Code
          <button 
            onClick={() => router.push('/icon-options')}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="View icon options"
          >
            <HiOutlineHandRaised className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <TextInput 
          placeholder="4-digit code" 
          inputMode="numeric" 
          maxLength={4} 
          value={code} 
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && /^[0-9]{4}$/.test(code)) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <Button onClick={onSubmit} disabled={!/^[0-9]{4}$/.test(code)}>Check In</Button>
      </Card>
      
      {confirmed && (
        <Card className="p-6 text-green-700 bg-green-50 border-green-200">
          Checked in with code {confirmed}. Have a great class!
        </Card>
      )}
      
      {error && (
        <Card className="p-6 text-red-700 bg-red-50 border-red-200">
          {error}
        </Card>
      )}
    </div>
  );
}
