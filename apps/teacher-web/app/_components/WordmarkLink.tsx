"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export function WordmarkLink() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  function onClick() {
    if (isSignedIn) router.push('/dashboard');
    else router.push('/sign-in');
  }
  return (
    <button onClick={onClick} className="flex items-baseline gap-2 hover:opacity-80 transition" aria-label="SnapRoll home">
      <span className="text-lg font-semibold text-black">SnapRoll</span>
      <span className="text-sm font-medium text-green-600">Instructor</span>
    </button>
  );
}


