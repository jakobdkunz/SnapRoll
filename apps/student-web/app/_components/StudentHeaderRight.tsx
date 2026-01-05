"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { api } from '@flamelink/convex-client';
import { useMutation } from 'convex/react';
import { useQuery } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Link from 'next/link';
import { Modal, Card, Button, TextInput } from '@flamelink/ui';
import { HiOutlineUserCircle, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { MdDarkMode, MdLightMode, MdPhoneIphone } from 'react-icons/md';

// type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

function StudentHeaderRightDemo() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  type ThemePref = 'light' | 'dark' | 'device';
  const setTheme = (pref: ThemePref) => {
    const w = window as unknown as { __theme?: { set: (p: ThemePref) => void } };
    w.__theme?.set(pref);
  };
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Demo user from Convex (student role)
  const currentUser = useQuery(api.functions.auth.getUserByEmail, { email: 'demo-student@example.com' });
  const resetDemo = useMutation(api.functions.demo.resetDemoData);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  async function onResetDemo() {
    if (!confirm("Are you sure you want to reset all demo data? This will delete everything and reseed with fresh data.")) {
      return;
    }
    setResetting(true);
    try {
      await resetDemo({});
      alert("Demo data reset successfully! The page will reload.");
      window.location.reload();
    } catch (error) {
      alert(`Failed to reset demo data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResetting(false);
    }
  }

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="opacity-0 pointer-events-none select-none">
        <button className="text-sm">Profile</button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition inline-flex items-center gap-2"
      >
        <HiOutlineUserCircle className="h-5 w-5" />
        {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Demo Mode'}
      </button>
      <div
        className={`absolute right-0 mt-2 w-56 rounded-lg border bg-white dark:bg-neutral-950/95 dark:border-neutral-800 shadow-md origin-top-right transition-all duration-150 z-[60] ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Demo Mode</div>
        <div className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">
          You're exploring the demo site. No login required.
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Appearance</div>
        <div className="px-1 pb-2">
          <button
            className="flex w-full items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            onClick={() => {
              setOpen(false);
              setTheme('light');
            }}
          >
            <MdLightMode className="h-4 w-4" /> Light
          </button>
          <button
            className="flex w-full items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            onClick={() => {
              setOpen(false);
              setTheme('dark');
            }}
          >
            <MdDarkMode className="h-4 w-4" /> Dark
          </button>
          <button
            className="flex w-full items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
            onClick={() => {
              setOpen(false);
              setTheme('device');
            }}
          >
            <MdPhoneIphone className="h-4 w-4" /> Device
          </button>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
        <button
          onClick={() => {
            setOpen(false);
            onResetDemo();
          }}
          disabled={resetting}
          className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-orange-600 dark:text-orange-400"
        >
          {resetting ? 'Resetting...' : 'Reset Demo Data'}
        </button>
        <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
        <button
          onClick={() => {
            setOpen(false);
            router.push('/dashboard' as Route);
          }}
          className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Go to Sections
        </button>
      </div>
    </div>
  );
}

function StudentHeaderRightWorkOS() {
  const router = useRouter();
  const { user: workosUser, loading, signOut } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  type ThemePref = 'light' | 'dark' | 'device';
  const setTheme = (pref: ThemePref) => {
    const w = window as unknown as { __theme?: { set: (p: ThemePref) => void } };
    w.__theme?.set(pref);
  };
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [devMsg, setDevMsg] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convex hooks
  const currentUser = useQuery(api.functions.auth.getCurrentUser);
  const resetDemo = useMutation(api.functions.demo.resetDemoData);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update form fields when student data loads
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName);
      setLastName(currentUser.lastName);
      setStudentId((currentUser._id as unknown as string) || null);
    }
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); setProfileOpen(false); }
    }
    function handleFocus() {}
    function handleStorage() {}
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [open]);

  const resetRateLimit = useMutation(api.functions.attendance.resetCheckinRateLimit);
  const devMode = (process.env.NEXT_PUBLIC_DEV_MODE ?? "false") === "true";
  const [resetting, setResetting] = useState(false);
  
  async function logout() {
    setStudentId(null);
    setFirstName(''); setLastName('');
    setOpen(false); setProfileOpen(false);
    // Use WorkOS signOut - this clears the session and redirects
    await signOut({ returnTo: '/' });
  }

  async function onResetDemo() {
    // Only available in demo deployments; keep hidden in regular mode.
    return;
    if (!confirm("Are you sure you want to reset all demo data? This will delete everything and reseed with fresh data.")) {
      return;
    }
    setResetting(true);
    try {
      await resetDemo({});
      alert("Demo data reset successfully! The page will reload.");
      window.location.reload();
    } catch (error) {
      alert(`Failed to reset demo data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResetting(false);
    }
  }

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="opacity-0 pointer-events-none select-none">
        <button className="text-sm">Profile</button>
      </div>
    );
  }

  // In demo mode, always show the header (no auth required)
  if (loading || !workosUser) {
    return (
      <div>
        <Link href={'/login' as Route}><Button variant="secondary">Log in</Button></Link>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="opacity-0 pointer-events-none select-none">
        <button className="text-sm">Profile</button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition inline-flex items-center gap-2">
        <HiOutlineUserCircle className="h-5 w-5" />
        {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Profile'}
      </button>
      <div className={`absolute right-0 mt-2 w-56 rounded-lg border bg-white dark:bg-neutral-950/95 dark:border-neutral-800 shadow-md origin-top-right transition-all duration-150 z-[60] ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <button className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2" onClick={() => { setOpen(false); setProfileOpen(true); }}>
          <HiOutlineUserCircle className="h-4 w-4" /> My Profile
        </button>
        <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
        <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Appearance</div>
        <div className="px-1 pb-2">
          <button className="flex w-full items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm" onClick={() => { setOpen(false); setTheme('light'); }}>
            <MdLightMode className="h-4 w-4" /> Light
          </button>
          <button className="flex w-full items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm" onClick={() => { setOpen(false); setTheme('dark'); }}>
            <MdDarkMode className="h-4 w-4" /> Dark
          </button>
          <button className="flex w-full items-center gap-2 px-2 py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm" onClick={() => { setOpen(false); setTheme('device'); }}>
            <MdPhoneIphone className="h-4 w-4" /> Device
          </button>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
        <button onClick={() => { setOpen(false); logout(); }} className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2">
          <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Log Out
        </button>
      </div>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)}>
        <Card className="p-6 w-[90vw] max-w-md space-y-4 text-neutral-900 dark:text-neutral-100">
          <div className="text-lg font-semibold">Your Profile</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">These settings are managed by your organization.</div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">First name</label>
            <TextInput value={firstName} disabled />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">Last name</label>
            <TextInput value={lastName} disabled />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">Email</label>
            <TextInput value={currentUser?.email || ''} disabled className="text-neutral-700 dark:text-neutral-300" />
          </div>
          {studentId && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400">User ID: {studentId}</div>
          )}
          {devMode && (
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={async () => {
                  setDevMsg(null);
                  setDevBusy(true);
                  try {
                    await resetRateLimit({});
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('dev:reset-checkin-rate-limit'));
                    }
                    setDevMsg('Rate limit reset.');
                  } catch (e: unknown) {
                    const msg = (e instanceof Error && e.message) ? e.message : 'Reset failed.';
                    setDevMsg(msg);
                  } finally {
                    setDevBusy(false);
                  }
                }}
                disabled={devBusy}
              >{devBusy ? 'Resetting…' : 'Reset check-in rate limit'}</Button>
              {devMsg && (
                <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{devMsg}</div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>Close</Button>
          </div>
        </Card>
      </Modal>
    </div>
  );
}

export function StudentHeaderRight() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <StudentHeaderRightDemo /> : <StudentHeaderRightWorkOS />;
}
