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
    <div className="w-full px-4 sm:px-6">
      <div className="mx-auto w-full max-w-sm sm:max-w-md">
        <SignIn 
          routing="hash" 
          signUpUrl="/sign-up" 
          fallbackRedirectUrl="/" 
          appearance={{ elements: { rootBox: 'w-full', card: 'w-full', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
        />
      </div>
    </div>
  );
}



