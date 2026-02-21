import { MarketingNavbar } from '@flamelink/ui';
import type { ReactNode } from 'react';

type FaqItem = {
  question: string;
  answer: ReactNode;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Can I try FlameLink without an account?',
    answer: (
      <>
        Yes!{' '}
        <a href="/demo" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Try the Demo ↗
        </a>{' '}
        to walk through the attendance flow with demo accounts, no login needed.
      </>
    ),
  },
  {
    question: 'Do students need to install anything?',
    answer:
      'Students can use FlameLink on the web or download the FlameLink mobile app for iOS and Android (coming fall 2026).',
  },
  {
    question: 'Can I run activities besides attendance?',
    answer: 'Yes! Run polls, make collaborative word clouds, and more.',
  },
  {
    question: 'How much does it cost?',
    answer: (
      <>
        Check out our{' '}
        <a href="/pricing" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Pricing page ↗
        </a>{' '}
        to learn more about plans and pricing.
      </>
    ),
  },
  {
    question: 'How do I get in touch?',
    answer: (
      <>
        Email us at{' '}
        <a href="mailto:hello@flamelink.app" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          hello@flamelink.app
        </a>
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-6">
      <MarketingNavbar />

      <section className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:p-9">
        <div
          className="pointer-events-none absolute -inset-[20%] opacity-30 animate-[gradient_drift_18s_linear_infinite]"
          style={{
            background:
              'radial-gradient(35% 55% at 28% 25%, rgba(59,130,246,0.16), transparent), radial-gradient(38% 42% at 75% 70%, rgba(16,185,129,0.14), transparent)',
          }}
        />
        <div className="relative z-10">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">FAQ</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-600 dark:text-neutral-300">
            If you have a question that isn&apos;t answered here,{' '}
            <a href="mailto:hello@flamelink.app" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              get in touch!
            </a>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{item.question}</span>
                <span className="shrink-0 text-neutral-500 transition-transform group-open:rotate-180 dark:text-neutral-400" aria-hidden="true">
                  <svg viewBox="0 0 20 20" className="h-5 w-5">
                    <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
