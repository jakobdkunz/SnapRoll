"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, TextInput } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

export default function TeacherWelcomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if already logged in
    const teacherId = localStorage.getItem('snaproll.teacherId');
    if (teacherId) {
      router.push('/dashboard');
    }
  }, [router]);

  const isValid = email.trim() && firstName.trim() && lastName.trim();

  async function onContinue() {
    if (!isValid) return;
    setLoading(true);
    try {
      const { teacher } = await apiFetch<{ teacher: { id: string; email: string; firstName: string; lastName: string } }>('/api/auth/teacher', {
        method: 'POST',
        body: JSON.stringify({ email, firstName, lastName }),
      });
      localStorage.setItem('snaproll.teacherId', teacher.id);
      localStorage.setItem('snaproll.teacherName', `${teacher.firstName} ${teacher.lastName}`);
      localStorage.setItem('snaproll.teacherEmail', teacher.email);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onContinue();
              }
            }}
          />
          <TextInput
            placeholder="First name"
            value={firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onContinue();
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
                onContinue();
              }
            }}
          />
          <Button onClick={onContinue} disabled={!isValid || loading} className="w-full">
            {loading ? 'Continuing...' : 'Continue'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
