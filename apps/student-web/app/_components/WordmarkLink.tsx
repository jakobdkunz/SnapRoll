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
    <button onClick={onClick} className="flex items-baseline gap-2 hover:opacity-80 transition" aria-label="SnapRoll home">
      <span className="text-base font-semibold text-black">SnapRoll</span>
      <span className="text-sm font-medium text-blue-600">Student</span>
    </button>
  );
}


