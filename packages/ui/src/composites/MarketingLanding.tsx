import type { ReactNode } from "react";
import { Card } from "../primitives/Card";
import { MarketingNavbar, type MarketingCta } from "./MarketingNavbar";

type Feature = {
  title: string;
  description: string;
};

export type MarketingLandingProps = {
  title?: string;
  description?: ReactNode;
  primaryCta?: MarketingCta;
  secondaryCta?: MarketingCta;
  instructorCta?: MarketingCta;
  studentCta?: MarketingCta;
  demoLinkHref?: string;
  demoLinkLabel?: string;
  features?: Feature[];
};

const DEFAULT_FEATURES: Feature[] = [
  {
    title: "Attendance in seconds",
    description: "Short codes and one-tap check-ins keep roll-taking fast and accurate.",
  },
  {
    title: "Engage with polls and more",
    description: "Run polls, word clouds, and slides in seconds without extra setup.",
  },
  {
    title: "Half the price",
    description: "All the essentials of classroom response at about 50% of Top Hat.",
  },
];

export function MarketingLanding({
  title = "A better Top Hat alternative for classroom response",
  description = (
    <>
      Take attendance in seconds, engage students with polls, word clouds, and slides all at{" "}
      <span className="font-semibold text-neutral-900 dark:text-neutral-100">half the price of Top Hat</span>.
    </>
  ),
  primaryCta = { href: "/demo", label: "Launch Demo ↗" },
  secondaryCta = { href: "#features", label: "Explore features →" },
  instructorCta = { href: "https://instructor.flamelink.app", label: "Instructor Login" },
  studentCta = { href: "https://student.flamelink.app", label: "Student Login" },
  demoLinkHref = "/demo",
  demoLinkLabel = "Demo",
  features = DEFAULT_FEATURES,
}: MarketingLandingProps) {
  const primaryCtaClassName =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 min-w-28";

  return (
    <div className="relative">
      <MarketingNavbar
        instructorCta={instructorCta}
        studentCta={studentCta}
        demoLinkHref={demoLinkHref}
        demoLinkLabel={demoLinkLabel}
      />
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-10 shadow-soft">
        <div
          className="pointer-events-none absolute -inset-[20%] opacity-30 animate-[gradient_drift_18s_linear_infinite]"
          style={{
            background:
              "radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.20), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.20), transparent)",
          }}
        />
        <div className="relative z-10">
          <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 items-center gap-6 sm:gap-10">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
              <p className="mt-3 text-neutral-600 dark:text-neutral-300 text-base sm:text-lg">{description}</p>
              <div className="mt-5 flex items-center justify-center lg:justify-start gap-3">
                <a href={primaryCta.href} target={primaryCta.target} rel={primaryCta.rel} className={primaryCtaClassName}>
                  {primaryCta.label}
                </a>
                <a href={secondaryCta.href} target={secondaryCta.target} rel={secondaryCta.rel} className="text-blue-600 hover:underline font-medium dark:text-blue-400">
                  {secondaryCta.label}
                </a>
              </div>
            </div>
            <div className="relative h-[360px] sm:h-[440px] lg:h-[520px]">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[96%] aspect-[16/10] drop-shadow-xl">
                <img
                  src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE7xxh4oXSTpQFUsHlVAhxM8u6DNnPiKqLzZc0"
                  alt="FlameLink on MacBook"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <div className="absolute left-[2%] bottom-2 w-[48%] aspect-[4/3] -rotate-2 drop-shadow-md">
                <img
                  src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE9pzLoI3Fz9VoWxJBkvIUwGrZKR4i6uQYEgMn"
                  alt="FlameLink on iPad"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <div className="absolute right-[0%] bottom-0 w-[30%] aspect-[9/19] rotate-2 drop-shadow-md">
                <img
                  src="https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepEcWE56ZJ1MDQrUL0pz8OZEKtHdsAjTXP6uBVJ"
                  alt="FlameLink on iPhone"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="features" className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {features.map((feature) => (
          <Card key={feature.title} className="p-5">
            <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{feature.title}</div>
            <div className="mt-1 text-neutral-600 dark:text-neutral-300 text-sm">{feature.description}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
