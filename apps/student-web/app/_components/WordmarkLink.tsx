"use client";
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";

// Safe wrapper for Clerk hooks that handles demo mode
function useSafeAuth() {
  if (isDemoMode) {
    return { isSignedIn: true };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuth: clerkUseAuth } = require('@clerk/nextjs');
    return clerkUseAuth();
  } catch {
    return { isSignedIn: false };
  }
}

export function WordmarkLink() {
  const router = useRouter();
  const { isSignedIn } = useSafeAuth();
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


