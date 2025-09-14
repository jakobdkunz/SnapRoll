import Link from 'next/link';

export function WordmarkLink() {
  return (
    <Link href="/dashboard" className="flex items-baseline gap-2 hover:opacity-80 transition" aria-label="FlameLink home">
      <span className="text-lg font-semibold text-black">FlameLink</span>
      <span className="text-sm font-medium text-green-600">Instructor</span>
    </Link>
  );
}


