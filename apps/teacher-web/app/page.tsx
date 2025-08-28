"use client";
import { Card } from '@snaproll/ui';
import { SignedIn, SignedOut, SignIn, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@snaproll/convex-client';

export default function TeacherWelcomePage() {
  const router = useRouter();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // When signed in, upsert the user as TEACHER then go to dashboard
    // Done inside SignedIn via a microtask
  }, []);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">SnapRoll</div>
        <SignedOut>
          <div className="mb-4 text-slate-600">Sign in to continue</div>
          <div className="rounded-xl overflow-hidden border">
            <SignIn signUpUrl="/sign-up" appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700' } }} />
          </div>
        </SignedOut>
        <SignedIn>
          <div className="text-slate-600">Signing you in…</div>
          {isLoaded && isSignedIn ? (
            Promise.resolve().then(async () => {
              try { await upsertUser({ role: "TEACHER" }); } catch {}
              router.replace('/dashboard');
            }) as any
          ) : null}
        </SignedIn>
      </Card>
    </div>
  );
}
