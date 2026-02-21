import type { ReactNode } from "react";
import { MarketingNavbar, type MarketingCta } from "./MarketingNavbar";
import { HeroAttendanceSimulation } from "./HeroAttendanceSimulation";

type Feature = {
  title: string;
  description: string;
  bullets?: string[];
};

export type MarketingLandingProps = {
  title?: string;
  description?: ReactNode;
  primaryCta?: MarketingCta;
  secondaryCta?: MarketingCta;
  instructorCta?: MarketingCta;
  studentCta?: MarketingCta;
  featuresLinkHref?: string;
  featuresLinkLabel?: string;
  demoLinkHref?: string;
  demoLinkLabel?: string;
  faqLinkHref?: string;
  faqLinkLabel?: string;
  pricingLinkHref?: string;
  pricingLinkLabel?: string;
  features?: Feature[];
};

const DEFAULT_FEATURES: Feature[] = [
  {
    title: "Attendance in seconds",
    description: "Instant attendance with randomized codes",
    bullets: [
      "Start attendance with one click",
    ],
  },
  {
    title: "Engage with polls and more",
    description: "Run polls, word clouds, and slides in seconds without extra setup.",
    bullets: [
      "Launch interactions from the same instructor dashboard",
      "Collect live responses during class discussion",
      "Use activity data as lightweight participation signals",
    ],
  },
  {
    title: "Half the price",
    description: "All the essentials of classroom response at about 50% of Top Hat.",
    bullets: [
      "Lower student cost without reducing core functionality",
      "Simple pricing for institutions and direct student use",
      "Designed to be practical and sustainable long-term",
    ],
  },
];

const FEATURE_IMAGES = [
  {
    src: "https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE7xxh4oXSTpQFUsHlVAhxM8u6DNnPiKqLzZc0",
    alt: "FlameLink on MacBook",
  },
  {
    src: "https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepE9pzLoI3Fz9VoWxJBkvIUwGrZKR4i6uQYEgMn",
    alt: "FlameLink on iPad",
  },
  {
    src: "https://fkrhb9mqrd.ufs.sh/f/1N0ranQZuepEcWE56ZJ1MDQrUL0pz8OZEKtHdsAjTXP6uBVJ",
    alt: "FlameLink on iPhone",
  },
];

const FEATURE_THEMES = [
  {
    shell: "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
    glow:
      "radial-gradient(38% 52% at 26% 28%, rgba(168,85,247,0.22), transparent), radial-gradient(46% 36% at 74% 66%, rgba(236,72,153,0.16), transparent)",
    glowOpacity: 0.32,
    dot: "bg-fuchsia-600 dark:bg-fuchsia-400",
  },
  {
    shell: "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
    glow:
      "radial-gradient(38% 52% at 26% 28%, rgba(16,185,129,0.22), transparent), radial-gradient(46% 36% at 74% 66%, rgba(245,158,11,0.14), transparent)",
    glowOpacity: 0.32,
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
  {
    shell: "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
    glow:
      "radial-gradient(38% 52% at 26% 28%, rgba(244,63,94,0.20), transparent), radial-gradient(46% 36% at 74% 66%, rgba(249,115,22,0.15), transparent)",
    glowOpacity: 0.32,
    dot: "bg-amber-600 dark:bg-amber-400",
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
  secondaryCta = { href: "#features", label: "Explore features ↓" },
  instructorCta = { href: "https://instructor.flamelink.app", label: "Instructor Login" },
  studentCta = { href: "https://student.flamelink.app", label: "Student Login" },
  featuresLinkHref = "/#features",
  featuresLinkLabel = "Features",
  demoLinkHref = "/demo",
  demoLinkLabel = "Demo",
  faqLinkHref = "/faq",
  faqLinkLabel = "FAQ",
  pricingLinkHref = "/pricing",
  pricingLinkLabel = "Pricing",
  features = DEFAULT_FEATURES,
}: MarketingLandingProps) {
  const primaryCtaClassName =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 min-w-28";

  return (
    <div className="relative">
      <MarketingNavbar
        instructorCta={instructorCta}
        studentCta={studentCta}
        featuresLinkHref={featuresLinkHref}
        featuresLinkLabel={featuresLinkLabel}
        demoLinkHref={demoLinkHref}
        demoLinkLabel={demoLinkLabel}
        faqLinkHref={faqLinkHref}
        faqLinkLabel={faqLinkLabel}
        pricingLinkHref={pricingLinkHref}
        pricingLinkLabel={pricingLinkLabel}
      />
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-10 shadow-soft">
        <div
          className="pointer-events-none absolute -inset-[20%] animate-[gradient_drift_18s_linear_infinite]"
          style={{
            background:
              "radial-gradient(40% 60% at 30% 30%, rgba(99,102,241,0.24), transparent), radial-gradient(50% 40% at 70% 60%, rgba(16,185,129,0.22), transparent)",
            opacity: 0.34,
          }}
        />
        <div className="relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">{title}</h1>
            <p className="mt-3 text-base text-neutral-600 dark:text-neutral-300 sm:text-lg">{description}</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <a href={primaryCta.href} target={primaryCta.target} rel={primaryCta.rel} className={primaryCtaClassName}>
                {primaryCta.label}
              </a>
              <a href={secondaryCta.href} target={secondaryCta.target} rel={secondaryCta.rel} className="text-blue-600 hover:underline font-medium dark:text-blue-400">
                {secondaryCta.label}
              </a>
            </div>
          </div>
        </div>
      </div>

      <section id="features" className="mt-8 space-y-6">
        {features.map((feature, index) => {
          const showAttendanceAnimation = index === 0;
          const media = FEATURE_IMAGES[(index - 1 + FEATURE_IMAGES.length) % FEATURE_IMAGES.length];
          const theme = FEATURE_THEMES[index % FEATURE_THEMES.length];
          const textFirst = index % 2 === 0;
          const titleNode = index === 0 ? (
            <>
              Attendance in <span className="italic">seconds</span>
            </>
          ) : (
            feature.title
          );
          return (
            <div
              key={feature.title}
              className={`relative overflow-hidden rounded-2xl border p-6 sm:p-10 shadow-soft ${theme.shell}`}
            >
              <div
                className="pointer-events-none absolute -inset-[20%] animate-[gradient_drift_18s_linear_infinite]"
                style={{
                  background: theme.glow,
                  opacity: theme.glowOpacity,
                }}
              />
              <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
                <div className={textFirst ? "" : "lg:order-2"}>
                  <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
                    {titleNode}
                  </h2>
                  <p className="mt-3 text-base text-neutral-600 dark:text-neutral-300 sm:text-lg">{feature.description}</p>
                  {feature.bullets && feature.bullets.length > 0 && (
                    <ul className="mt-5 space-y-2">
                      {feature.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                          <span className={`mt-1 h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className={`${showAttendanceAnimation ? "relative" : "relative h-[280px] sm:h-[340px] lg:h-[380px]"} ${textFirst ? "" : "lg:order-1"}`}>
                  {showAttendanceAnimation ? (
                    <HeroAttendanceSimulation />
                  ) : (
                    <img
                      src={media.src}
                      alt={media.alt}
                      className="h-full w-full object-contain drop-shadow-xl"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
