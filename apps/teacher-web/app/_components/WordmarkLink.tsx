import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';

export function WordmarkLink() {
  return (
    <Link href={'/dashboard' as Route} className="flex items-center gap-0.5 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 -translate-y-[3px]" />
      <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">FlameLink</span>
      <span className="text-lg font-medium text-green-600 dark:text-neutral-300 ml-1">Instructor</span>
    </Link>
  );
}


