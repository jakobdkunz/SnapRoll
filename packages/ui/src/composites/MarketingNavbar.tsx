"use client";

import { useEffect, useState } from "react";

export type MarketingCta = {
  href: string;
  label: string;
  target?: "_blank" | "_self";
  rel?: string;
};

export type MarketingNavbarProps = {
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
  homeHref?: string;
};

type Theme = "light" | "dark";
type ThemePreference = "system" | Theme;

const THEME_PREF_KEY = "marketing-theme-preference";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    return;
  }
  root.classList.remove("dark");
  root.style.colorScheme = "light";
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M21 14.2A9 9 0 1 1 9.8 3a7 7 0 1 0 11.2 11.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MarketingNavbar({
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
  homeHref = "/",
}: MarketingNavbarProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const getThemeFromDevice = (): Theme => (mediaQuery.matches ? "dark" : "light");
    let initialPreference: ThemePreference = "system";
    try {
      const storedPreference = localStorage.getItem(THEME_PREF_KEY);
      if (storedPreference === "light" || storedPreference === "dark" || storedPreference === "system") {
        initialPreference = storedPreference;
      }
    } catch (e) {
      void e;
    }
    const initialTheme = initialPreference === "system" ? getThemeFromDevice() : initialPreference;
    applyTheme(initialTheme);
    setTheme(initialTheme);
    setThemePreference(initialPreference);
  }, []);

  useEffect(() => {
    if (themePreference === null) {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const getThemeFromDevice = (): Theme => (mediaQuery.matches ? "dark" : "light");

    function onSystemThemeChange() {
      if (themePreference !== "system") {
        return;
      }
      const nextTheme = getThemeFromDevice();
      applyTheme(nextTheme);
      setTheme(nextTheme);
    }

    if (themePreference === "system") {
      const nextTheme = getThemeFromDevice();
      applyTheme(nextTheme);
      setTheme(nextTheme);
      mediaQuery.addEventListener("change", onSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
    }

    applyTheme(themePreference);
    setTheme(themePreference);
    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, [themePreference]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function onToggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
  }

  function onToggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setThemePreference(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem(THEME_PREF_KEY, nextTheme);
    } catch (e) {
      void e;
    }
  }

  const primaryCtaClassName =
    "inline-flex h-12 items-center justify-center rounded-xl px-5 text-base font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 min-w-32";
  const secondaryCtaClassName =
    "inline-flex h-12 items-center justify-center rounded-xl px-5 text-base font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";
  const navItemBaseClassName =
    "inline-flex h-12 items-center justify-center rounded-lg px-4 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-900 lg:h-full lg:rounded-none lg:px-5";
  const themeToggleClassName =
    "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

  const navLinks = [
    { href: featuresLinkHref, label: featuresLinkLabel },
    { href: demoLinkHref, label: demoLinkLabel },
    { href: faqLinkHref, label: faqLinkLabel },
    { href: pricingLinkHref, label: pricingLinkLabel },
  ];

  return (
    <header className="mb-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white/95 shadow-soft backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <nav className="lg:h-20">
        <div className="flex items-center justify-between gap-3 p-4 lg:hidden">
          <a href={homeHref} className="inline-flex items-center gap-1 pl-2 text-neutral-900 dark:text-neutral-100" aria-label="FlameLink home">
            <img src="/logo.svg" alt="" className="h-6 w-6 -translate-y-[2px]" />
            <span className="text-xl font-semibold">FlameLink</span>
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="marketing-mobile-menu"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                {mobileMenuOpen ? (
                  <path d="M6 6L18 18M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div
          id="marketing-mobile-menu"
          className={`overflow-hidden border-t border-neutral-200 px-4 transition-[max-height,opacity,padding] duration-200 ease-out dark:border-neutral-800 lg:hidden ${
            mobileMenuOpen ? "max-h-[32rem] pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"
          }`}
        >
          <div className="mt-3 grid grid-cols-1 gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex h-11 items-center justify-center rounded-lg px-2 text-base font-medium text-neutral-800 transition-colors hover:text-neutral-950 dark:text-neutral-100 dark:hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href={instructorCta.href}
              target={instructorCta.target}
              rel={instructorCta.rel}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => setMobileMenuOpen(false)}
            >
              {instructorCta.label}
            </a>
            <a
              href={studentCta.href}
              target={studentCta.target}
              rel={studentCta.rel}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              {studentCta.label}
            </a>
          </div>
        </div>

        <div className="hidden h-full flex-row items-stretch justify-between gap-5 lg:flex">
          <div className="flex items-center gap-1 lg:h-full lg:items-stretch">
            <a href={homeHref} className="inline-flex items-center gap-1 pl-2 text-neutral-900 dark:text-neutral-100 lg:h-full lg:pl-6 lg:pr-5" aria-label="FlameLink home">
              <img src="/logo.svg" alt="" className="h-6 w-6 -translate-y-[2px]" />
              <span className="text-xl font-semibold">FlameLink</span>
            </a>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={navItemBaseClassName}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex w-auto flex-row items-center gap-3 pr-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className={themeToggleClassName}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <a href={instructorCta.href} target={instructorCta.target} rel={instructorCta.rel} className={secondaryCtaClassName}>
              {instructorCta.label}
            </a>
            <a href={studentCta.href} target={studentCta.target} rel={studentCta.rel} className={primaryCtaClassName}>
              {studentCta.label}
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
