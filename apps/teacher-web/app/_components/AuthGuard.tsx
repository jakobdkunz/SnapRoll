"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

function DemoAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // Keep users inside demo (avoid auth pages)
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/callback') || pathname.startsWith('/login')) {
      router.replace('/dashboard' as Route);
    }
  }, [pathname, router]);
  return null;
}

function WorkOSAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const isPublic = pathname === '/' || pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/callback') || pathname.startsWith('/login');
    if (!user && !isPublic) {
      const t = setTimeout(() => {
        if (!user) router.replace('/login' as Route);
      }, 10);
      return () => clearTimeout(t);
    }
  }, [loading, user, pathname, router]);

  return null;
}

export function AuthGuard() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <DemoAuthGuard /> : <WorkOSAuthGuard />;
}
