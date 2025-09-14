import Link from 'next/link';
import Image from 'next/image';

export function WordmarkLink() {
  return (
    <Link href="/dashboard" className="flex items-baseline gap-2 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5" />
      <span className="text-lg font-semibold text-black">FlameLink</span>
      <span className="text-lg font-medium text-green-600">Instructor</span>
    </Link>
  );
}


