"use client";
import { useEffect } from 'react';
import { Card } from '@snaproll/ui';
import { SignIn, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function StudentSignInCatchAll() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-4 sm:p-8 text-center">
        <div className="rounded-xl overflow-hidden border">
          <SignIn 
            routing="hash" 
            signUpUrl="/sign-up" 
            fallbackRedirectUrl="/" 
            appearance={{ elements: { rootBox: 'w-full max-w-full', card: 'w-full max-w-full shadow-none', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
          />
        </div>
      </Card>
    </div>
  );
}


