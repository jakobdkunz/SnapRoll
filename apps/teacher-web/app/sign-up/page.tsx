"use client";
import { useEffect } from 'react';
import { Card } from '@snaproll/ui';
import { SignUp, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function TeacherSignUpPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="rounded-xl overflow-hidden border">
          <SignUp 
            routing="hash"
            signInUrl="/"
            fallbackRedirectUrl="/"
            appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700' } }} 
          />
        </div>
      </Card>
    </div>
  );
}


