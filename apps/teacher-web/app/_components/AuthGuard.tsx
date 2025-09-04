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
    // Rely on middleware for redirect behavior; client doesn't redirect
    // This avoids redirect flicker during hydrations and preserves target routes on refresh
  }, [isLoaded, isSignedIn, user, pathname, router]);

  return null;
}


