"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';

export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    const isPublic = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    if (!isSignedIn && !isPublic) {
      // Debounce redirect to avoid loops during initial hydration
      const t = setTimeout(() => {
        if (!isSignedIn) router.replace('/');
      }, 50);
      return () => clearTimeout(t);
    }
    // Do not persist PII in localStorage; rely on Clerk/Convex in-memory state
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}


