"use client";
import { SignIn } from '@clerk/nextjs';

export default function TeacherSignInCatchAll() {
  return (
    <div className="w-full flex justify-center py-10 overflow-visible">
      <div className="w-full max-w-sm sm:max-w-md">
        <SignIn 
          routing="hash" 
          signUpUrl="/sign-up" 
          fallbackRedirectUrl="/dashboard" 
          appearance={{ elements: { rootBox: 'w-full', card: 'w-full mx-auto', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
        />
      </div>
    </div>
  );
}



