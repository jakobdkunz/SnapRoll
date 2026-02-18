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
  demoLinkHref?: string;
  demoLinkLabel?: string;
  homeHref?: string;
};

type Theme = "light" | "dark";

const THEME_KEY = "theme";

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
  demoLinkHref = "/demo",
  demoLinkLabel = "Demo",
  homeHref = "/",
}: MarketingNavbarProps) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let initialTheme: Theme = "light";
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light") {
        initialTheme = stored;
      } else {
        initialTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    } catch (e) {
      void e;
    }
    applyTheme(initialTheme);
    setTheme(initialTheme);
  }, []);

  function onToggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch (e) {
      void e;
    }
  }

  const primaryCtaClassName =
    "inline-flex h-12 items-center justify-center rounded-xl px-5 text-base font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 min-w-32";
  const secondaryCtaClassName =
    "inline-flex h-12 items-center justify-center rounded-xl px-5 text-base font-medium shadow-soft transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800";
  const demoCtaClassName =
    "inline-flex h-12 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-4 text-base font-medium text-neutral-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:h-full sm:rounded-none sm:border-0 sm:bg-transparent sm:px-7 sm:hover:bg-neutral-100 dark:sm:border-0 dark:sm:bg-transparent dark:sm:hover:bg-neutral-900";
  const themeToggleClassName =
    "inline-flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

  return (
    <header className="mb-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white/95 shadow-soft backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <nav className="flex flex-col gap-4 p-4 sm:h-20 sm:flex-row sm:items-stretch sm:justify-between sm:gap-5 sm:p-0">
        <div className="flex items-center sm:h-full sm:items-stretch">
          <a href={homeHref} className="inline-flex items-center gap-1 pl-2 text-neutral-900 dark:text-neutral-100 sm:h-full sm:pl-6 sm:pr-5" aria-label="FlameLink home">
            <img src="/logo.svg" alt="" className="h-6 w-6 -translate-y-[2px]" />
            <span className="text-xl font-semibold">FlameLink</span>
          </a>
          <a href={demoLinkHref} className={demoCtaClassName}>
            {demoLinkLabel}
          </a>
        </div>
        <div className="flex w-full flex-col gap-3 sm:h-full sm:w-auto sm:flex-row sm:items-center sm:pr-3">
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
      </nav>
    </header>
  );
}
