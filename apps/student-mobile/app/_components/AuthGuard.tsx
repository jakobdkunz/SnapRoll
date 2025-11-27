import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    const isPublic = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
    if (!isSignedIn && !isPublic) {
      const t = setTimeout(() => {
        if (!isSignedIn) router.replace('/sign-in');
      }, 10);
      return () => clearTimeout(t);
    }
    // If signed in and on public route, redirect to sections
    if (isSignedIn && (pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
      const t = setTimeout(() => {
        if (isSignedIn) router.replace('/sections');
      }, 10);
      return () => clearTimeout(t);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}

