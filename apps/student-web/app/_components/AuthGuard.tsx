"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Route } from 'next';
import { useAuth, useUser } from '@clerk/nextjs';

function DemoAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // Set cookie for service worker
    try {
      document.cookie = `flamelink_auth=1; Path=/; SameSite=Lax`;
    } catch (e) { void e; }

    // Keep users inside demo (avoid auth pages)
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/sso-callback')) {
      router.replace('/sections' as Route);
    }
  }, [pathname, router]);

  return null;
}

function ClerkAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    const isPublic = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    if (!isSignedIn && !isPublic) {
      const t = setTimeout(() => {
        if (!isSignedIn) router.replace('/sign-in' as Route);
      }, 10);
      return () => clearTimeout(t);
    }
    // Set a non-PII cookie to indicate auth state for the service worker
    try {
      document.cookie = `flamelink_auth=${isSignedIn ? '1' : '0'}; Path=/; SameSite=Lax`;
    } catch (e) { void e; }
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}

export function AuthGuard() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <DemoAuthGuard /> : <ClerkAuthGuard />;
}


