"use client";
import { Card } from '@snaproll/ui';
import { SignedOut, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@snaproll/convex-client';

export default function TeacherWelcomePage() {
  const router = useRouter();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const { isLoaded, isSignedIn } = useAuth();
  const didUpsertRef = { current: false };

  // Redirect guests to dedicated sign-in page
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) router.replace('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  // Upsert once per browser session (non-blocking), then redirect immediately
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    try {
      const key = 'snaproll.teacher.upserted';
      const already = typeof window !== 'undefined' ? sessionStorage.getItem(key) : '1';
      if (!already) {
        // Fire and forget; do not block navigation
        upsertUser({ role: 'TEACHER' }).finally(() => {
          try { sessionStorage.setItem(key, '1'); } catch {}
        });
      }
    } catch {}
    router.replace('/dashboard');
  }, [isLoaded, isSignedIn, upsertUser, router]);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">SnapRoll</div>
        <SignedOut>
          <div className="mb-4 text-slate-600">Sign in to continue</div>
        </SignedOut>
      </Card>
    </div>
  );
}
