"use client";
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { HiChevronDown, HiOutlineUserCircle } from 'react-icons/hi2';
import { useDemoUser, DEMO_STUDENTS, getCurrentDemoStudent } from './DemoUserContext';

function DemoUserDropdown() {
  const { demoUserEmail, setDemoUserEmail, isHydrated } = useDemoUser();
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStudent = getCurrentDemoStudent(demoUserEmail);
  const primaryStudents = DEMO_STUDENTS.filter((student) => student.active);
  const additionalStudents = DEMO_STUDENTS.filter((student) => !student.active);

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

  const displayStudent = isHydrated ? currentStudent : DEMO_STUDENTS[0];
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-lg font-medium text-neutral-800 dark:text-neutral-300 hover:opacity-80 transition"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <HiOutlineUserCircle className="h-5 w-5" />
        <span>{displayStudent.firstName}</span>
        <HiChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute left-0 mt-2 w-64 rounded-lg border bg-white dark:bg-neutral-950 dark:border-neutral-800 shadow-lg origin-top-left transition-all duration-150 z-[100] ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="listbox"
        aria-label="Select demo student"
      >
        <div className="py-1 max-h-[320px] overflow-y-auto">
          {primaryStudents.map((student) => {
            const isSelected = student.email === demoUserEmail;
            const number = DEMO_STUDENTS.findIndex((s) => s.email === student.email) + 1;

            return (
              <button
                key={student.email}
                onClick={() => handleSelect(student.email)}
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
                <span>{student.firstName} {student.lastName}</span>
                {isSelected && (
                  <span className="ml-auto text-slate-700 dark:text-neutral-200">✓</span>
                )}
              </button>
            );
          })}
          {additionalStudents.length > 0 && (
            <>
              <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
              <button
                onClick={() => setShowMore((v) => !v)}
                className="w-full text-left px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-900"
                aria-expanded={showMore}
              >
                {showMore ? 'Hide more' : `Show more (${additionalStudents.length})`}
              </button>
              {showMore && additionalStudents.map((student) => {
                const isSelected = student.email === demoUserEmail;
                const number = DEMO_STUDENTS.findIndex((s) => s.email === student.email) + 1;

                return (
                  <button
                    key={student.email}
                    onClick={() => handleSelect(student.email)}
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
                    <span>{student.firstName} {student.lastName}</span>
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

function AdaptiveWordmarkButton({
  roleLabel,
  onClick,
}: {
  roleLabel: string;
  onClick: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLSpanElement>(null);
  const roleMeasureRef = useRef<HTMLSpanElement>(null);
  const [showRole, setShowRole] = useState(true);

  useEffect(() => {
    function updateRoleVisibility() {
      const container = containerRef.current;
      const base = baseRef.current;
      const roleMeasure = roleMeasureRef.current;
      if (!container || !base || !roleMeasure) return;

      const roleWidth = roleMeasure.getBoundingClientRect().width;
      const baseRect = base.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const projectedRoleRight = baseRect.right + 4 + roleWidth;
      let collidesWithSwitcher = false;
      const switcher = document.querySelector<HTMLElement>('[data-header-switcher]');
      if (switcher && switcher.firstElementChild) {
        const switcherRect = switcher.getBoundingClientRect();
        if (switcherRect.width > 0) {
          collidesWithSwitcher = projectedRoleRight >= (switcherRect.left - 8);
        }
      }
      const fitsContainer = projectedRoleRight <= (containerRect.right - 2);
      setShowRole(fitsContainer && !collidesWithSwitcher);
    }

    updateRoleVisibility();
    const rafId = window.requestAnimationFrame(updateRoleVisibility);
    const observer = new ResizeObserver(updateRoleVisibility);
    if (containerRef.current) observer.observe(containerRef.current);
    const switcher = document.querySelector<HTMLElement>('[data-header-switcher]');
    if (switcher) observer.observe(switcher);
    window.addEventListener('resize', updateRoleVisibility);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateRoleVisibility);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <button onClick={onClick} className="relative flex max-w-full items-center gap-0.5 whitespace-nowrap overflow-hidden hover:opacity-80 transition" aria-label="FlameLink home">
        <span ref={baseRef} className="inline-flex items-center gap-0.5">
          <Image src="/logo.svg" alt="" width={20} height={20} className="h-5 w-5 -translate-y-[3px]" />
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">FlameLink</span>
        </span>
        {showRole ? (
          <span className="text-lg font-medium text-blue-600 dark:text-neutral-300 ml-1">{roleLabel}</span>
        ) : null}
        <span ref={roleMeasureRef} aria-hidden="true" className="absolute invisible text-lg font-medium ml-1">
          {roleLabel}
        </span>
      </button>
    </div>
  );
}

function DemoWordmarkLink() {
  const router = useRouter();
  function onClick() {
    router.push('/dashboard' as Route);
  }
  return <AdaptiveWordmarkButton roleLabel="Student (Demo)" onClick={onClick} />;
}

function WorkOSWordmarkLink() {
  const router = useRouter();
  const { user } = useAuth();
  function onClick() {
    if (user) router.push('/dashboard' as Route);
    else router.push('/' as Route);
  }
  return (
    <AdaptiveWordmarkButton roleLabel="Student" onClick={onClick} />
  );
}

export function WordmarkLink() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <DemoWordmarkLink /> : <WorkOSWordmarkLink />;
}
