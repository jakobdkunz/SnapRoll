import { MarketingNavbar } from '@flamelink/ui';

type FeatureRow = {
  text: string;
  included: boolean;
};

type Plan = {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  emphasized?: boolean;
  badgeLabel?: string;
  accent?: 'blue' | 'green';
  features: FeatureRow[];
};

const PLANS: Plan[] = [
  {
    name: 'Basic',
    price: 'Free Forever',
    description: 'For individual instructors running smaller sections.',
    ctaLabel: 'Get Started',
    ctaHref: 'https://instructor.flamelink.app',
    emphasized: true,
    badgeLabel: 'Try before you buy',
    accent: 'green',
    features: [
      { text: 'Unlimited courses', included: true },
      { text: 'Up to 40 students per course', included: true },
      { text: 'Automatic attendance', included: true },
      { text: 'Location verification for attendance', included: false },
      { text: 'Engage students with polls, word clouds, and more', included: false },
      { text: 'Export attendance data as .CSV or .XLSX', included: false },
    ],
  },
  {
    name: 'Standard',
    price: '$29',
    cadence: 'per term or $49 per year',
    description: 'For instructors managing larger classes and longer-term use.',
    ctaLabel: 'Get Started',
    ctaHref: 'https://instructor.flamelink.app',
    emphasized: true,
    accent: 'blue',
    features: [
      { text: 'Unlimited courses', included: true },
      { text: 'Up to 700 students per course', included: true },
      { text: 'Automatic Attendance', included: true },
      { text: 'Location verification for attendance', included: true },
      { text: 'Engage students with polls, word clouds, and more', included: true },
      { text: 'Export attendance data as .CSV or .XLSX', included: true },
    ],
  },
  {
    name: 'Instututions',
    price: 'Custom pricing',
    description: 'For departments and institutions that need centralized rollout and support.',
    ctaLabel: 'Contact Sales',
    ctaHref: 'mailto:hello@flamelink.app',
    features: [
      { text: 'Unlimited users', included: true },
      { text: 'SAML/SSO with all major providers', included: true },
      { text: 'Bulk data exports', included: true },
      { text: 'Special pricing', included: true },
    ],
  },
];

function FeatureLine({ row }: { row: FeatureRow }) {
  return (
    <li className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-200">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          row.included
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
        }`}
        aria-hidden="true"
      >
        {row.included ? '✓' : '✕'}
      </span>
      <span>{row.text}</span>
    </li>
  );
}

export default function PricingPage() {
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
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">Pricing</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-600 dark:text-neutral-300">
            Choose the plan that fits your class size and workflow. Upgrade anytime.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-soft dark:bg-neutral-900 ${
                plan.emphasized
                  ? plan.accent === 'green'
                    ? 'border-emerald-300 ring-2 ring-emerald-200 dark:border-emerald-700 dark:ring-emerald-900/70'
                    : 'border-blue-300 ring-2 ring-blue-200 dark:border-blue-700 dark:ring-blue-900/70'
                  : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              {plan.emphasized && plan.badgeLabel && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${
                    plan.accent === 'green' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                >
                  {plan.badgeLabel}
                </div>
              )}

              <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{plan.name}</div>
              <div className="mt-3 flex items-end gap-2">
                <div className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{plan.price}</div>
                {plan.cadence && <div className="pb-1 text-sm text-neutral-600 dark:text-neutral-300">{plan.cadence}</div>}
              </div>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{plan.description}</p>

              <ul className="mt-5 space-y-3">
                {plan.features.map((row) => (
                  <FeatureLine key={`${plan.name}-${row.text}`} row={row} />
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <a
                  href={plan.ctaHref}
                  className={`inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors ${
                    plan.emphasized
                      ? plan.accent === 'green'
                        ? 'border border-transparent bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-transparent bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {plan.ctaLabel}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
