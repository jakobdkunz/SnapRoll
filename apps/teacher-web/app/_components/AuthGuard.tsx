"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';

export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";

  useEffect(() => {
    // Skip auth checks in demo mode
    if (isDemoMode) return;
    
    if (!isLoaded) return;
    const isPublic = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    if (!isSignedIn && !isPublic) {
      const t = setTimeout(() => {
        if (!isSignedIn) router.replace('/sign-in');
      }, 10);
      return () => clearTimeout(t);
    }
  }, [isLoaded, isSignedIn, user, pathname, router, isDemoMode]);

  return null;
}


