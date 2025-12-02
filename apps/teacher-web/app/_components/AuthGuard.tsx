"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}


