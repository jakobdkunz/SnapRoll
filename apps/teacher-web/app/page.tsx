"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

export default function RootRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";

  useEffect(() => {
    if (isDemoMode) {
      router.replace('/dashboard' as Route);
      return;
    }
    if (loading) return;
    router.replace((user ? '/dashboard' : '/sign-in') as Route);
  }, [isDemoMode, loading, router, user]);

  return null;
}
