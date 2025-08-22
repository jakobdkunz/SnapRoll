"use client";
import { useRouter } from 'next/navigation';

export function WordmarkLink() {
  const router = useRouter();
  function onClick() {
    const id = typeof window !== 'undefined' ? localStorage.getItem('snaproll.teacherId') : null;
    if (id) router.push('/dashboard');
    else router.push('/');
  }
  return (
    <button onClick={onClick} className="text-lg font-semibold hover:opacity-80 transition" aria-label="SnapRoll home">
      SnapRoll
    </button>
  );
}


