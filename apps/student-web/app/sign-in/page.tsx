"use client";
import { Card } from '@snaproll/ui';
import { SignIn } from '@clerk/nextjs';

export default function StudentSignInPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">Sign in</div>
        <div className="rounded-xl overflow-hidden border">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/" appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700' } }} />
        </div>
      </Card>
    </div>
  );
}


