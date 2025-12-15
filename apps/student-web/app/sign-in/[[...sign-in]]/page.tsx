"use client";
import { useEffect } from 'react';
import { SignIn, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

function DemoRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to as Route);
  }, [router, to]);
  return null;
}

function StudentSignInClerk() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/sections' as Route);
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="w-full flex justify-center py-10 overflow-visible">
      <div className="w-full max-w-sm sm:max-w-md">
        <SignIn 
          routing="hash" 
          signUpUrl="/sign-up" 
          fallbackRedirectUrl="/sections" 
          appearance={{ elements: { rootBox: 'w-full', card: 'w-full mx-auto', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
        />
      </div>
    </div>
  );
}

export default function StudentSignInCatchAll() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  if (isDemoMode) return <DemoRedirect to="/sections" />;
  return <StudentSignInClerk />;
}


