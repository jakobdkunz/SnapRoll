"use client";
import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { useState, useRef, useEffect } from 'react';
import { HiChevronDown, HiOutlineUserCircle } from 'react-icons/hi2';
import { useDemoUser, DEMO_INSTRUCTORS, getCurrentDemoInstructor } from './DemoUserContext';

function DemoUserDropdown() {
  const { demoUserEmail, setDemoUserEmail, isHydrated } = useDemoUser();
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentInstructor = getCurrentDemoInstructor(demoUserEmail);
  const primaryInstructors = DEMO_INSTRUCTORS.filter((instructor) => instructor.active);
  const additionalInstructors = DEMO_INSTRUCTORS.filter((instructor) => !instructor.active);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function handleSelect(email: string) {
    setDemoUserEmail(email);
    setOpen(false);
    setShowMore(false);
    window.location.reload();
  }

  const displayInstructor = isHydrated ? currentInstructor : DEMO_INSTRUCTORS[0];
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-lg font-medium text-neutral-800 dark:text-neutral-300 hover:opacity-80 transition"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <HiOutlineUserCircle className="h-5 w-5" />
        <span>{displayInstructor.firstName}</span>
        <HiChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute left-0 mt-2 w-64 rounded-lg border bg-white dark:bg-neutral-950 dark:border-neutral-800 shadow-lg origin-top-left transition-all duration-150 z-[100] ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="listbox"
        aria-label="Select demo instructor"
      >
        <div className="py-1 max-h-[320px] overflow-y-auto">
          {primaryInstructors.map((instructor) => {
            const isSelected = instructor.email === demoUserEmail;
            const number = DEMO_INSTRUCTORS.findIndex((i) => i.email === instructor.email) + 1;

            return (
              <button
                key={instructor.email}
                onClick={() => handleSelect(instructor.email)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'hover:bg-slate-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span className="font-mono text-xs text-neutral-400 dark:text-neutral-600 w-6 text-right">
                  {number}.
                </span>
                <span>{instructor.firstName} {instructor.lastName}</span>
                {isSelected && (
                  <span className="ml-auto text-slate-700 dark:text-neutral-200">✓</span>
                )}
              </button>
            );
          })}
          {additionalInstructors.length > 0 && (
            <>
              <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
              <button
                onClick={() => setShowMore((v) => !v)}
                className="w-full text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-900"
                aria-expanded={showMore}
              >
                {showMore ? 'Hide more' : `Show more (${additionalInstructors.length})`}
              </button>
              {showMore && additionalInstructors.map((instructor) => {
                const isSelected = instructor.email === demoUserEmail;
                const number = DEMO_INSTRUCTORS.findIndex((i) => i.email === instructor.email) + 1;

                return (
                  <button
                    key={instructor.email}
                    onClick={() => handleSelect(instructor.email)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                        : 'hover:bg-slate-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="font-mono text-xs text-neutral-400 dark:text-neutral-600 w-6 text-right">
                      {number}.
                    </span>
                    <span>{instructor.firstName} {instructor.lastName}</span>
                    {isSelected && (
                      <span className="ml-auto text-slate-700 dark:text-neutral-200">✓</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DemoUserSwitcher() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  if (!isDemoMode) return null;
  return <DemoUserDropdown />;
}

function DemoWordmarkLink() {
  return (
    <Link href={'/dashboard' as Route} className="flex items-center gap-0.5 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 -translate-y-[3px]" />
      <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">FlameLink</span>
      <span className="text-lg font-medium text-green-600 dark:text-neutral-300 ml-1">Instructor (Demo)</span>
    </Link>
  );
}

function WorkOSWordmarkLink() {
  return (
    <Link href={'/dashboard' as Route} className="flex items-center gap-0.5 hover:opacity-80 transition" aria-label="FlameLink home">
      <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 -translate-y-[3px]" />
      <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">FlameLink</span>
      <span className="text-lg font-medium text-green-600 dark:text-neutral-300 ml-1">Instructor</span>
    </Link>
  );
}

export function WordmarkLink() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <DemoWordmarkLink /> : <WorkOSWordmarkLink />;
}
