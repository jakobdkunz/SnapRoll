"use client";
import { useRouter } from 'next/navigation';

export function WordmarkLink() {
  const router = useRouter();
  function onClick() {
    const id = typeof window !== 'undefined' ? localStorage.getItem('snaproll.studentId') : null;
    if (id) router.push('/sections');
    else router.push('/');
  }
  return (
    <button onClick={onClick} className="text-base font-semibold hover:opacity-80 transition" aria-label="SnapRoll home">
      SnapRoll
    </button>
  );
}


