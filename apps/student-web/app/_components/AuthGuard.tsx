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
    const isLogin = pathname === '/';
    if (!isSignedIn && !isLogin) {
      router.replace('/');
      return;
    }
    if (isSignedIn && user) {
      try {
        const email = user.primaryEmailAddress?.emailAddress;
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (email) localStorage.setItem('snaproll.studentEmail', email);
        if (fullName) localStorage.setItem('snaproll.studentName', fullName);
      } catch {}
    }
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}


