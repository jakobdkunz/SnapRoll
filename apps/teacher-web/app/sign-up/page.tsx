"use client";
import { SignUp } from '@clerk/nextjs';

export default function TeacherSignUpPage() {
  return (
    <div className="w-full flex justify-center py-10 overflow-visible">
      <div className="w-full max-w-sm sm:max-w-md">
        <SignUp 
          routing="hash"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
          appearance={{ elements: { rootBox: 'w-full', card: 'w-full mx-auto', formButtonPrimary: 'w-full bg-blue-600 hover:bg-blue-700' } }} 
        />
      </div>
    </div>
  );
}


