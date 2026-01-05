"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

function DemoRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to as Route);
  }, [router, to]);
  return null;
}

function StudentSignUpWorkOS() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the login route which will redirect to WorkOS AuthKit
    // WorkOS AuthKit handles both sign-in and sign-up in a unified flow
    router.replace('/login' as Route);
  }, [router]);

  return (
    <div className="w-full flex justify-center py-10">
      <div className="w-full max-w-sm sm:max-w-md text-center">
        <p className="text-neutral-600 dark:text-neutral-400">Redirecting to sign up...</p>
      </div>
    </div>
  );
}

export default function StudentSignUpCatchAll() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  if (isDemoMode) return <DemoRedirect to="/dashboard" />;
  return <StudentSignUpWorkOS />;
}
