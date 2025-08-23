"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, TextInput } from '@snaproll/ui';
import { isValidEmail } from '@snaproll/lib';
import { apiFetch } from '@snaproll/api-client';

export default function TeacherWelcomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [needsNames, setNeedsNames] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check if already logged in
    const teacherId = localStorage.getItem('snaproll.teacherId');
    if (teacherId) {
      router.push('/dashboard');
    }
  }, [router]);

  async function onContinue() {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      // Try email-only login
      const res = await apiFetch<{ teacher?: { id: string; email: string; firstName: string; lastName: string }; found?: boolean }>(
        '/api/auth/teacher',
        { method: 'POST', body: JSON.stringify({ email: cleanEmail }) }
      );
      if (res.teacher) {
        const t = res.teacher;
        localStorage.setItem('snaproll.teacherId', t.id);
        localStorage.setItem('snaproll.teacherName', `${t.firstName} ${t.lastName}`);
        localStorage.setItem('snaproll.teacherEmail', t.email);
        router.push('/dashboard');
        return;
      }
      // If not found, reveal name fields and wait for user to submit again
      setNeedsNames(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to continue');
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !isValidEmail(cleanEmail) || !firstName.trim() || !lastName.trim()) {
      setError('Please enter a valid email and your first and last name.');
      return;
    }
    setLoading(true);
    try {
      const { teacher } = await apiFetch<{ teacher: { id: string; email: string; firstName: string; lastName: string } }>(
        '/api/auth/teacher',
        { method: 'POST', body: JSON.stringify({ email: cleanEmail, firstName: firstName.trim(), lastName: lastName.trim() }) }
      );
      localStorage.setItem('snaproll.teacherId', teacher.id);
      localStorage.setItem('snaproll.teacherName', `${teacher.firstName} ${teacher.lastName}`);
      localStorage.setItem('snaproll.teacherEmail', teacher.email);
      router.push('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-8">SnapRoll</div>
        <div className="space-y-4">
          <TextInput
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              if (needsNames) {
                // Reset back to email-first flow if user edits email
                setNeedsNames(false);
                setFirstName('');
                setLastName('');
                setError(null);
              }
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (needsNames) {
                  onCreate();
                } else {
                  onContinue();
                }
              }
            }}
          />
          {needsNames && (
            <>
              <div className="text-sm text-slate-600">
                We didn’t find an instructor account for that email. Enter your first and last name to create one.
              </div>
              <TextInput
                placeholder="First name"
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCreate();
                  }
                }}
              />
              <TextInput
                placeholder="Last name"
                value={lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCreate();
                  }
                }}
              />
            </>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!needsNames ? (
            <Button onClick={onContinue} disabled={loading || !isValidEmail(email.trim())} className="w-full">
              {loading ? 'Logging in…' : 'Continue'}
            </Button>
          ) : (
            <Button onClick={onCreate} disabled={loading || !isValidEmail(email.trim()) || !firstName.trim() || !lastName.trim()} className="w-full">
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
