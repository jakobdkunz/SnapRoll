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
    <button onClick={onClick} className="flex items-baseline gap-2 hover:opacity-80 transition" aria-label="SnapRoll home">
      <span className="text-lg font-semibold text-black">SnapRoll</span>
      <span className="text-sm font-medium text-green-600">Instructor</span>
    </button>
  );
}


