"use client";
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const id = localStorage.getItem('snaproll.studentId');
    const isLogin = pathname === '/';
    if (!id && !isLogin) {
      router.replace('/');
      return;
    }
  }, [pathname, router]);

  // Don't run auth logic until client-side hydration is complete
  if (!isClient) {
    return null;
  }

  return null;
}


