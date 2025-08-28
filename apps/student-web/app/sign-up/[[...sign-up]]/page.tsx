"use client";
import { useEffect } from 'react';
import { Card } from '@snaproll/ui';
import { SignUp, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function StudentSignUpCatchAll() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">Create your account</div>
        <div className="rounded-xl overflow-hidden border">
          <SignUp 
            routing="hash" 
            signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || '/'} 
            afterSignUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/'} 
            fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/'} 
            appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700' } }} 
          />
          <div className="text-xs text-slate-500 mt-3">Student accounts only. If you're an instructor, use the instructor site.</div>
        </div>
      </Card>
    </div>
  );
}


