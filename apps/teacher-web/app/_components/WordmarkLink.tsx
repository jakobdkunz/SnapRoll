"use client";
import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiChevronDown, HiOutlineUserCircle } from 'react-icons/hi2';
import { useDemoUser, DEMO_INSTRUCTORS, getCurrentDemoInstructor } from './DemoUserContext';

const DISABLED_TOOLTIP_TEXT = "We've disabled switching to all demo users for simplicity. You'll still see them in courses.";

type TooltipState = {
  visible: boolean;
  text: string;
  anchorX: number;
  anchorY: number;
};

function TooltipOverlay({ visible, text, anchorX, anchorY }: TooltipState) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: anchorX, top: anchorY });

  useLayoutEffect(() => {
    if (!visible || !ref.current) return;
    const el = ref.current;
    const vw = window.innerWidth;
    const margin = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(vw - margin - w, Math.max(margin, anchorX - w / 2));
    let top = anchorY - margin - h;
    if (top < margin) top = anchorY + margin;
    setPos({ left, top });
  }, [visible, anchorX, anchorY]);

  if (!visible) return null;

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999, maxWidth: 'calc(100vw - 16px)' }}
      className="pointer-events-none px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg"
    >
      {text}
    </div>,
    document.body
  );
}

function DemoUserDropdown() {
  const { demoUserEmail, setDemoUserEmail, isHydrated } = useDemoUser();
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', anchorX: 0, anchorY: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentInstructor = getCurrentDemoInstructor(demoUserEmail);

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

  function showTooltip(text: string, rect: DOMRect) {
    setTooltip({ visible: true, text, anchorX: rect.left + rect.width / 2, anchorY: rect.top });
  }

  function hideTooltip() {
    setTooltip(t => ({ ...t, visible: false }));
  }

  function handleSelect(email: string, active: boolean) {
    if (!active) return;
    setDemoUserEmail(email);
    setOpen(false);
    window.location.reload();
  }

  const displayInstructor = isHydrated ? currentInstructor : DEMO_INSTRUCTORS[0];
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-lg font-medium text-neutral-800 dark:text-neutral-300 hover:opacity-80 transition"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
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
          {DEMO_INSTRUCTORS.map((instructor, index) => {
            const isSelected = instructor.email === demoUserEmail;
            const isActive = instructor.active;
            const number = index + 1;

            return (
              <button
                key={instructor.email}
                onClick={() => handleSelect(instructor.email, isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    showTooltip(DISABLED_TOOLTIP_TEXT, (e.currentTarget as HTMLElement).getBoundingClientRect());
                  }
                }}
                onMouseLeave={hideTooltip}
                onTouchStart={(e) => {
                  if (!isActive) {
                    showTooltip(DISABLED_TOOLTIP_TEXT, (e.currentTarget as HTMLElement).getBoundingClientRect());
                  }
                }}
                onTouchEnd={hideTooltip}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                  isActive
                    ? isSelected
                      ? 'bg-slate-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                      : 'hover:bg-slate-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                }`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={!isActive}
              >
                <span className="font-mono text-xs text-neutral-400 dark:text-neutral-600 w-6 text-right">
                  {number}.
                </span>
                <span className={isActive ? '' : 'opacity-50'}>
                  {instructor.firstName} {instructor.lastName}
                </span>
                {isSelected && isActive && (
                  <span className="ml-auto text-slate-700 dark:text-neutral-200">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <TooltipOverlay {...tooltip} />
    </div>
  );
}

export function DemoUserSwitcher() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  if (!isDemoMode) return null;
  return (
    <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
      <HiOutlineUserCircle className="h-5 w-5" />
      <DemoUserDropdown />
    </div>
  );
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
