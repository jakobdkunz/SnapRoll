"use client";
import { Card } from '@snaproll/ui';
import { SignedIn, SignedOut, SignIn, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@snaproll/convex-client';

export default function StudentWelcomePage() {
  const router = useRouter();
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const { isLoaded, isSignedIn } = useAuth();

  // Normalize Clerk's hosted redirect pattern to our path-based /sign-up
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect_url');
    if (!redirectUrl) return;
    try {
      const url = new URL(redirectUrl, window.location.origin);
      if (url.pathname === '/sign-up') router.replace('/sign-up');
    } catch {}
  }, [router]);

  // Handle Clerk Account Portal hash fallback: "#/?...redirect_url=..."
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { hash } = window.location;
    if (!hash || !hash.startsWith('#/')) return;
    const qsIndex = hash.indexOf('?');
    if (qsIndex === -1) return;
    const qs = hash.slice(qsIndex + 1);
    const params = new URLSearchParams(qs);
    const redirectUrl = params.get('redirect_url');
    if (!redirectUrl) return;
    try {
      const url = new URL(redirectUrl, window.location.origin);
      if (url.origin === window.location.origin && url.pathname === '/sign-up') {
        router.replace('/sign-up');
      } else if (url.origin === window.location.origin) {
        router.replace(url.pathname + url.search + url.hash);
      }
    } catch {}
  }, [router]);
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">SnapRoll</div>
        <SignedOut>
          <div className="mb-4 text-slate-600">Sign in to continue</div>
          <div className="rounded-xl overflow-hidden border">
            <SignIn 
              routing="path"
              path="/"
              signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL || '/sign-up'}
              fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/'}
              appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700' } }} 
            />
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
