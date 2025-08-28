"use client";
import { Card } from '@snaproll/ui';
import { SignedIn, SignedOut, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@snaproll/convex-client';

export default function StudentWelcomePage() {
  const router = useRouter();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const didUpsertRef = useRef(false);

  // Redirect guests to dedicated sign-in page
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) router.replace('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">SnapRoll</div>
        <SignedOut>
          <div className="mb-4 text-slate-600">Sign in to continue</div>
        </SignedOut>
        <SignedIn>
          <div className="text-slate-600">Signing you in…</div>
          {(() => {
            useEffect(() => {
              if (didUpsertRef.current) return;
              if (!isLoaded || !isSignedIn) return;
              (async () => {
                try {
                  const token = await getToken({ template: 'convex' });
                  if (!token) return;
                  didUpsertRef.current = true;
                  await upsertUser({ role: "STUDENT" });
                } catch {}
                router.replace('/sections');
              })();
            }, [isLoaded, isSignedIn, getToken, upsertUser, router]);
            return null;
          })()}
        </SignedIn>
      </Card>
    </div>
  );
}
