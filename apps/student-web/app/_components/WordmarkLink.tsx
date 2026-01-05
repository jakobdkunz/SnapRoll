"use client";
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Image from 'next/image';

function DemoWordmarkLink() {
  const router = useRouter();
  function onClick() {
    router.push('/dashboard' as Route);
  }
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 -translate-y-[3px]" />
      <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">FlameLink</span>
      <span className="text-lg font-medium text-blue-600 dark:text-neutral-300 ml-1">Student</span>
    </button>
  );
}

function WorkOSWordmarkLink() {
  const router = useRouter();
  const { user } = useAuth();
  function onClick() {
    if (user) router.push('/dashboard' as Route);
    else router.push('/' as Route);
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
  return isDemoMode ? <DemoWordmarkLink /> : <WorkOSWordmarkLink />;
}


