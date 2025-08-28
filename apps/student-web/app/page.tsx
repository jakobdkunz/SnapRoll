"use client";
import { Card } from '@snaproll/ui';
import { SignedIn, SignedOut, SignIn, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@snaproll/convex-client';

export default function StudentWelcomePage() {
  const router = useRouter();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">SnapRoll</div>
        <SignedOut>
          <div className="mb-4 text-slate-600">Sign in to continue</div>
          <div className="rounded-xl overflow-hidden border">
            <SignIn routing="hash" signUpUrl="/" appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700' } }} />
          </div>
        </SignedOut>
        <SignedIn>
          <div className="text-slate-600">Signing you in…</div>
          {isLoaded && isSignedIn ? (
            Promise.resolve().then(async () => {
              try { await upsertUser({ role: "STUDENT" }); } catch {}
              router.replace('/sections');
            }) as any
          ) : null}
        </SignedIn>
      </Card>
    </div>
  );
}
