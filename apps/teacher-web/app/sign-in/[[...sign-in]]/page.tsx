"use client";
import { useEffect } from 'react';
import { SignIn, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function TeacherSignInCatchAll() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="w-full px-4 sm:px-8 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] overflow-x-hidden flex justify-center">
      <SignIn 
        routing="hash" 
        signUpUrl="/sign-up" 
        fallbackRedirectUrl="/" 
        appearance={{ elements: { rootBox: 'w-full', card: 'mx-auto !w-full max-w-[26rem] shadow-none', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
      />
    </div>
  );
}



