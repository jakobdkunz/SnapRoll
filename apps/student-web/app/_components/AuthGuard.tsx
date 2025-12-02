"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";

// Safe wrapper for Clerk hooks that handles demo mode
function useSafeAuth() {
  if (isDemoMode) {
    return { isLoaded: true, isSignedIn: true };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuth: clerkUseAuth } = require('@clerk/nextjs');
    return clerkUseAuth();
  } catch {
    return { isLoaded: true, isSignedIn: false };
  }
}

function useSafeUser() {
  if (isDemoMode) {
    return { user: null };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useUser: clerkUseUser } = require('@clerk/nextjs');
    return clerkUseUser();
  } catch {
    return { user: null };
  }
}

export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useSafeAuth();
  const { user } = useSafeUser();

  useEffect(() => {
    // In demo mode, set cookie and return
    if (isDemoMode) {
      try {
        document.cookie = `flamelink_auth=1; Path=/; SameSite=Lax`;
      } catch (e) { void e; }
      return;
    }
    
    if (!isLoaded) return;
    const isPublic = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    if (!isSignedIn && !isPublic) {
      const t = setTimeout(() => {
        if (!isSignedIn) router.replace('/sign-in');
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


