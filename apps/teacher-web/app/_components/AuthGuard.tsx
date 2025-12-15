"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';

function DemoAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // Keep users inside demo (avoid auth pages)
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/sso-callback')) {
      router.replace('/dashboard');
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
        if (!isSignedIn) router.replace('/sign-in');
      }, 10);
      return () => clearTimeout(t);
    }
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}

export function AuthGuard() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <DemoAuthGuard /> : <ClerkAuthGuard />;
}


