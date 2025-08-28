"use client";
import { Card } from '@snaproll/ui';
import { SignUp, SignedIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function StudentSignUpPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8 text-center">
        <div className="text-2xl font-bold mb-6">Create your account</div>
        <SignedIn>
          {Promise.resolve().then(() => { router.replace('/'); }) as any}
        </SignedIn>
        <div className="rounded-xl overflow-hidden border">
          <SignUp afterSignUpUrl="/" appearance={{ elements: { formButtonPrimary: 'bg-blue-600 hover:bg-blue-700' } }} />
        </div>
      </Card>
    </div>
  );
}


