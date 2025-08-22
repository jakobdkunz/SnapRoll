"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem('snaproll.studentId') : null;
    const isLogin = pathname === '/';
    if (!id && !isLogin) {
      router.replace('/');
      return;
    }
  }, [pathname, router]);

  return null;
}


