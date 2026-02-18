import { MarketingNavbar } from '@flamelink/ui';

const INSTRUCTOR_DEMO_URL = 'https://demoinstructor.flamelink.app';
const STUDENT_DEMO_URL = 'https://demostudent.flamelink.app';
const STUDENT_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(STUDENT_DEMO_URL)}`;

function InlineWordmark({ role }: { role: 'Instructor' | 'Student' }) {
  const roleClass =
    role === 'Instructor' ? 'text-green-600 dark:text-neutral-300' : 'text-blue-600 dark:text-neutral-300';
  return (
    <span>
      <span className="font-semibold italic text-neutral-900 dark:text-neutral-100">FlameLink</span>
      <span className={`ml-1 font-medium italic ${roleClass}`}>{role}</span>
    </span>
  );
}

export default function DemoPage() {
  return (
    <div className="space-y-6">
      <MarketingNavbar demoLinkHref="/demo" demoLinkLabel="Demo" />
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-soft dark:border-neutral-800 dark:bg-neutral-900 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">Try the Demo</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 sm:text-base">
          Use FlameLink with a real instance. Take attendance, it&apos;s easy!
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid md:hidden">
          <section className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center sm:p-8">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Step 1: Launch <InlineWordmark role="Student" /> on your smartphone
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Scan this QR code:</p>

            <div className="mt-4 inline-flex rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700">
              <img src={STUDENT_QR_URL} alt="QR code for student demo URL" className="h-44 w-44 rounded-md sm:h-52 sm:w-52" />
            </div>

            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{STUDENT_DEMO_URL}</p>

            <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-300">Or, you can</p>
            <div className="mt-3">
              <a
                href={STUDENT_DEMO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 font-medium text-white shadow-soft transition-colors hover:bg-blue-700"
              >
                Launch Student Demo ↗
              </a>
            </div>
          </section>

          <section className="flex min-h-[360px] flex-col items-center justify-center border-t border-neutral-200 p-6 text-center dark:border-neutral-800 sm:p-8">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Step 2: Launch <InlineWordmark role="Instructor" /> on your computer
            </h2>
            <div className="mt-5">
              <a
                href={INSTRUCTOR_DEMO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 font-medium text-white shadow-soft transition-colors hover:bg-blue-700"
              >
                Launch Instructor Demo ↗
              </a>
            </div>
            <p className="mt-6 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Step 3: Take attendance!</p>
          </section>
        </div>

        <div className="hidden min-h-[560px] grid-cols-2 grid-rows-[auto_auto_auto_auto] content-center md:grid">
          <div className="border-r border-neutral-200 px-8 text-center dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Step 1: Launch <InlineWordmark role="Student" /> on your smartphone
            </h2>
          </div>
          <div className="px-8 text-center">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Step 2: Launch <InlineWordmark role="Instructor" /> on your computer
            </h2>
          </div>

          <div className="border-r border-neutral-200 px-8 pt-2 text-center dark:border-neutral-800">
            <p className="mx-auto max-w-sm text-sm text-neutral-600 dark:text-neutral-300">Scan this QR code:</p>
          </div>
          <div className="px-8 pt-2 text-center" />

          <div className="flex items-center justify-center border-r border-neutral-200 px-8 pb-0 pt-2 dark:border-neutral-800">
            <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700">
              <img src={STUDENT_QR_URL} alt="QR code for student demo URL" className="h-52 w-52 rounded-md" />
            </div>
          </div>
          <div className="flex items-center justify-center px-8 pb-0 pt-2">
            <a
              href={INSTRUCTOR_DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 font-medium text-white shadow-soft transition-colors hover:bg-blue-700"
            >
              Launch Instructor Demo ↗
            </a>
          </div>

          <div className="border-r border-neutral-200 px-8 pt-1 text-center dark:border-neutral-800">
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{STUDENT_DEMO_URL}</p>
            <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-300">Or, you can</p>
            <div className="mt-3">
              <a
                href={STUDENT_DEMO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 font-medium text-white shadow-soft transition-colors hover:bg-blue-700"
              >
                Launch Student Demo ↗
              </a>
            </div>
          </div>
          <div className="px-8 pt-1 text-center">
            <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Step 3: Take attendance!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
