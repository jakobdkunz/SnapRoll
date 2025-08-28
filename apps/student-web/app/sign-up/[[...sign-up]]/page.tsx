"use client";
import { useEffect } from 'react';
import { SignUp, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function StudentSignUpCatchAll() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="w-full px-4 sm:px-8 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] overflow-x-hidden flex justify-center">
      <SignUp 
        routing="hash" 
        signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || '/'} 
        afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/'} 
        fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/'} 
        appearance={{ elements: { rootBox: 'w-full', card: 'mx-auto !w-full max-w-[26rem] shadow-none', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
      />
    </div>
  );
}


