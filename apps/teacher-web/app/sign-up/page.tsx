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
    <div className="mx-auto max-w-md p-4 sm:p-8">
      <SignUp 
        routing="hash"
        signInUrl="/"
        fallbackRedirectUrl="/"
        appearance={{ elements: { rootBox: 'mx-auto w-full', card: 'mx-auto max-w-full shadow-none', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
      />
    </div>
  );
}


