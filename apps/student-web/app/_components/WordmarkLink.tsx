"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';

export function WordmarkLink() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  function onClick() {
    if (isSignedIn) router.push('/sections');
    else router.push('/');
  }
  return (
    <button onClick={onClick} className="flex items-baseline gap-2 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5" />
      <span className="text-lg font-semibold text-black">FlameLink</span>
      <span className="text-lg font-medium text-blue-600">Student</span>
    </button>
  );
}


