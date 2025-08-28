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
    if (isSignedIn && user) {
      try {
        const email = user.primaryEmailAddress?.emailAddress;
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (email) localStorage.setItem('snaproll.teacherEmail', email);
        if (fullName) localStorage.setItem('snaproll.teacherName', fullName);
      } catch {}
    }
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}


