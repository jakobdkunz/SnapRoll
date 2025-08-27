"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, TextInput } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import { useMutation } from 'convex/react';
import { isValidEmail } from '@snaproll/lib';

export default function StudentWelcomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Convex mutations
  const authenticateStudent = useMutation(api.functions.auth.authenticateStudent);

  useEffect(() => {
    setMounted(true);
    // Check if already logged in
    const timer = setTimeout(() => {
      const studentId = localStorage.getItem('snaproll.studentId');
      if (studentId) {
        router.push('/sections');
      } else {
        // Retry once more after a longer delay
        setTimeout(() => {
          const retryStudentId = localStorage.getItem('snaproll.studentId');
          if (retryStudentId) {
            router.push('/sections');
          }
        }, 500);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [router]);

  async function onContinue() {
    if (!email.trim() || !isValidEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { student } = await authenticateStudent({ email: email.trim() });
      localStorage.setItem('snaproll.studentId', (student as any)._id);
      localStorage.setItem('snaproll.studentName', `${(student as any).firstName} ${(student as any).lastName}`);
      localStorage.setItem('snaproll.studentEmail', (student as any).email);
      router.push('/sections');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to sign in. Please try again.';
      setError(errorMessage);
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
            placeholder="Your email address"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onContinue();
              }
            }}
          />
          <Button onClick={onContinue} disabled={!email.trim() || !isValidEmail(email.trim()) || loading} className="w-full">
            {loading ? 'Logging in…' : 'Continue'}
          </Button>
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
