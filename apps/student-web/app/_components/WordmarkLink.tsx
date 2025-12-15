"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';

function DemoWordmarkLink() {
  const router = useRouter();
  function onClick() {
    router.push('/sections');
  }
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 -translate-y-[3px]" />
      <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">FlameLink</span>
      <span className="text-lg font-medium text-blue-600 dark:text-neutral-300 ml-1">Student</span>
    </button>
  );
}

function ClerkWordmarkLink() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  function onClick() {
    if (isSignedIn) router.push('/sections');
    else router.push('/');
  }
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 -translate-y-[3px]" />
      <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">FlameLink</span>
      <span className="text-lg font-medium text-blue-600 dark:text-neutral-300 ml-1">Student</span>
    </button>
  );
}

export function WordmarkLink() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <DemoWordmarkLink /> : <ClerkWordmarkLink />;
}


