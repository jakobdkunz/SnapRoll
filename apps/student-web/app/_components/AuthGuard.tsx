"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
      const t = setTimeout(() => {
        if (!isSignedIn) router.replace('/');
      }, 50);
      return () => clearTimeout(t);
    }
    // Set a non-PII cookie to indicate auth state for the service worker
    try {
      document.cookie = `snaproll_auth=${isSignedIn ? '1' : '0'}; Path=/; SameSite=Lax`;
    } catch {}
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}


