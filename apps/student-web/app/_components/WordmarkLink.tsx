"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export function WordmarkLink() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  function onClick() {
    if (isSignedIn) router.push('/sections');
    else router.push('/');
  }
  return (
    <button onClick={onClick} className="flex items-baseline gap-2 hover:opacity-80 transition" aria-label="FlameLink home">
      <span className="text-base font-semibold text-black">FlameLink</span>
      <span className="text-sm font-medium text-blue-600">Student</span>
    </button>
  );
}


