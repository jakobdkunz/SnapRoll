"use client";
import { useEffect } from 'react';
import { SignUp, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function TeacherSignUpPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="w-full px-4 sm:px-8 flex justify-center">
      <SignUp 
        routing="hash"
        signInUrl="/"
        fallbackRedirectUrl="/"
        appearance={{ elements: { rootBox: 'mx-auto w-full', card: 'mx-auto w-full max-w-sm sm:max-w-md', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
      />
    </div>
  );
}


