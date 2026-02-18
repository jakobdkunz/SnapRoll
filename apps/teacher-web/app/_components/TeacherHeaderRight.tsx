"use client";
import { HiOutlineUserCircle, HiOutlineArrowRightOnRectangle, HiOutlineCog6Tooth, HiOutlineArrowPath } from 'react-icons/hi2';
import { MdDarkMode, MdLightMode, MdPhoneIphone } from 'react-icons/md';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import Link from 'next/link';
import { Modal, Card, Button, TextInput } from '@flamelink/ui';
import { useDemoUser } from './DemoUserContext';

function TeacherHeaderRightDemo() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  type ThemePref = 'light' | 'dark' | 'device';
  const setTheme = (pref: ThemePref) => {
    const w = window as unknown as { __theme?: { set: (p: ThemePref) => void } };
    w.__theme?.set(pref);
  };
  const [isClient, setIsClient] = useState(false);

  const { demoUserEmail, isHydrated } = useDemoUser();
  const resetDemo = useMutation(api.functions.demo.resetDemoData);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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

  async function onResetDemoConfirm() {
    setResetting(true);
    setResetError(null);
    try {
      await resetDemo({ demoUserEmail });
      setResetConfirmOpen(false);
      router.replace('/dashboard' as Route);
    } catch (error) {
      setResetError(`Failed to reset demo data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResetting(false);
    }
  }

  if (!isClient || !isHydrated) {
    return (
      <div className="opacity-0 pointer-events-none select-none">
        <button className="text-sm">Options</button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition inline-flex items-center gap-2"
      >
        <HiOutlineCog6Tooth className="h-5 w-5" />
        Options
      </button>
      <div
        className={`absolute right-0 mt-2 w-56 rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-800 shadow-md origin-top-right transition-all duration-150 z-[60] ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
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
        <button
          onClick={() => { setOpen(false); setResetError(null); setResetConfirmOpen(true); }}
          disabled={resetting}
          className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <HiOutlineArrowPath className="h-4 w-4" />
          {resetting ? 'Resetting...' : 'Reset Demo Data'}
        </button>
      </div>
      <Modal open={resetConfirmOpen} onClose={() => { if (!resetting) { setResetConfirmOpen(false); setResetError(null); } }}>
        <Card className="p-6 w-[90vw] max-w-md space-y-4 text-neutral-900 dark:text-neutral-100">
          <div className="text-lg font-semibold">Reset demo data?</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            This will delete all demo records and reseed fresh demo data.
          </div>
          {resetError && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded p-2">
              {resetError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setResetConfirmOpen(false); setResetError(null); }} disabled={resetting}>Cancel</Button>
            <Button onClick={onResetDemoConfirm} disabled={resetting}>{resetting ? 'Resetting…' : 'Reset Demo Data'}</Button>
          </div>
        </Card>
      </Modal>
    </div>
  );
}

function TeacherHeaderRightWorkOS() {
  const router = useRouter();
  const { user: workosUser, loading, signOut } = useAuth();
  const [teacherId, setTeacherId] = useState<Id<'users'> | null>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  type ThemePref = 'light' | 'dark' | 'device';
  const setTheme = (pref: ThemePref) => {
    const w = window as unknown as { __theme?: { set: (p: ThemePref) => void } };
    w.__theme?.set(pref);
  };
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Dev generator state
  const [devOpen, setDevOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("Demo Section");
  const [studentCount, setStudentCount] = useState(25);
  const [daysBack, setDaysBack] = useState(30);
  const [pctPresent, setPctPresent] = useState(50);
  const [pctPresentManual, setPctPresentManual] = useState(10);
  const [pctAbsentManual, setPctAbsentManual] = useState(20);
  const [pctBlank, setPctBlank] = useState(10);
  const [pctNotEnrolledManual, setPctNotEnrolledManual] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [devSuccess, setDevSuccess] = useState<string | null>(null);

  // Convex hooks
  const currentUser = useQuery(api.functions.auth.getCurrentUser, {});
  const updateUser = useMutation(api.functions.users.update);
  const generateDemo = useMutation(api.functions.demo.generateDemoData);
  const resetDemo = useMutation(api.functions.demo.resetDemoData);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // When Convex resolves the current user, cache identifiers
  useEffect(() => {
    if (currentUser) {
      const newId = (currentUser._id as Id<'users'>) || null;
      setTeacherId(newId);
      // Avoid persisting PII to localStorage
    }
  }, [currentUser]);

  // Update form fields when current user data loads
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName);
      setLastName(currentUser.lastName);
    }
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setAppearanceOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); setProfileOpen(false); }
    }
    function handleFocus() { /* no-op */ }
    function handleStorage() { /* no-op */ }
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

  async function saveProfile() {
    const id = teacherId;
    if (!id || !firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      await updateUser({ id, firstName: firstName.trim(), lastName: lastName.trim() });
      setProfileOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const devMode = (process.env.NEXT_PUBLIC_DEV_MODE ?? "false") === "true";
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  const [resetting, setResetting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function onGenerateDemo() {
    if (!devMode) return;
    setGenerating(true);
    setDevError(null);
    setDevSuccess(null);
    try {
      const total = pctPresent + pctPresentManual + pctAbsentManual + pctBlank + pctNotEnrolledManual;
      if (total !== 100) {
        setDevError("Percentages must add up to 100%");
        return;
      }
      await generateDemo({
        sectionTitle,
        studentCount,
        daysBack,
        percentages: {
          present: pctPresent,
          presentManual: pctPresentManual,
          absentManual: pctAbsentManual,
          blank: pctBlank,
          notEnrolledManual: pctNotEnrolledManual,
        },
        ...(currentUser?.email ? { demoUserEmail: currentUser.email } : {}),
      });
      setDevSuccess("Demo data generated.");
    } catch (error) {
      setDevError(error instanceof Error ? error.message : "Failed to generate demo data.");
    } finally {
      setGenerating(false);
    }
  }

  async function logout() {
    setTeacherId(null);
    setFirstName(''); setLastName('');
    setOpen(false); setProfileOpen(false);
    // Use WorkOS signOut - this clears the session and redirects
    await signOut({ returnTo: '/' });
  }

  async function onResetDemo() {
    if (!isDemoMode) return;
    setResetting(true);
    setResetError(null);
    try {
      await resetDemo(currentUser?.email ? { demoUserEmail: currentUser.email } : {});
      setResetConfirmOpen(false);
      router.replace('/dashboard' as Route);
    } catch (error) {
      setResetError(`Failed to reset demo data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  if (isDemoMode) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button onClick={() => setOpen((v) => !v)} className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition inline-flex items-center gap-2">
          <HiOutlineUserCircle className="h-5 w-5" />
          {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Demo Mode'}
        </button>
        <div className={`absolute right-0 mt-2 w-56 rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-800 shadow-md origin-top-right transition-all duration-150 z-[60] ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Demo Mode</div>
          <div className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">
            You're exploring the demo site. No login required.
          </div>
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
          <button 
            onClick={() => { setOpen(false); setResetError(null); setResetConfirmOpen(true); }} 
            disabled={resetting}
            className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        </div>
      </div>
    );
  }

  if (loading || !workosUser) {
    return (
      <div>
        <Link href={'/login' as Route}><Button variant="secondary">Log in</Button></Link>
      </div>
    );
  }

  if (!teacherId) {
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
      <div className={`absolute right-0 mt-2 w-56 rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-800 shadow-md origin-top-right transition-all duration-150 z-[60] ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
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
        {isDemoMode && (
          <>
            <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
            <button 
              onClick={() => { setOpen(false); setResetError(null); setResetConfirmOpen(true); }} 
              disabled={resetting}
              className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? 'Resetting...' : 'Reset Demo Data'}
            </button>
          </>
        )}
        <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
        <button onClick={() => { setOpen(false); logout(); }} className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2">
          <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Log Out
        </button>
      </div>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)}>
        <Card className="p-6 w-[90vw] max-w-md space-y-4 text-neutral-900 dark:text-neutral-100">
          <div className="text-lg font-semibold">Your Profile</div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">First name</label>
            <TextInput value={firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">Last name</label>
            <TextInput value={lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-neutral-600 dark:text-neutral-400">Email</label>
            <TextInput value={currentUser?.email || ''} disabled className="text-neutral-700 dark:text-neutral-300" />
            <div className="text-xs text-neutral-600 dark:text-neutral-400">To change your email, please contact support.</div>
          </div>
          {teacherId && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400">User ID: {teacherId}</div>
          )}

          {devMode && (
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">Developer Tools</div>
                <Button variant="secondary" onClick={() => setDevOpen(!devOpen)}>
                  {devOpen ? 'Hide' : 'Show'}
                </Button>
              </div>
              {devOpen && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1 text-left">
                    <label className="text-sm text-neutral-600 dark:text-neutral-400">Demo section name</label>
                    <TextInput value={sectionTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSectionTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-neutral-600 dark:text-neutral-400">Students</label>
                      <TextInput type="number" value={studentCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentCount(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-neutral-600 dark:text-neutral-400">Days (back from today)</label>
                      <TextInput type="number" value={daysBack} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDaysBack(Number(e.target.value || 0))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-neutral-600 dark:text-neutral-400">% Present</label>
                      <TextInput type="number" value={pctPresent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctPresent(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-neutral-600 dark:text-neutral-400">% Present (manual)</label>
                      <TextInput type="number" value={pctPresentManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctPresentManual(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-neutral-600 dark:text-neutral-400">% Absent (manual)</label>
                      <TextInput type="number" value={pctAbsentManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctAbsentManual(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-neutral-600 dark:text-neutral-400">% Blank (never manual)</label>
                      <TextInput type="number" value={pctBlank} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctBlank(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-neutral-600 dark:text-neutral-400">% Not Enrolled (manual)</label>
                      <TextInput type="number" value={pctNotEnrolledManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctNotEnrolledManual(Number(e.target.value || 0))} />
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">Percentages must add to 100%.</div>
                  {devError && (
                    <div className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded p-2">
                      {devError}
                    </div>
                  )}
                  {devSuccess && (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded p-2">
                      {devSuccess}
                    </div>
                  )}
                  <Button onClick={onGenerateDemo} disabled={generating}>
                    {generating ? 'Generating…' : 'Generate demo data'}
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={saving || !firstName.trim() || !lastName.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </Card>
      </Modal>
      <Modal open={resetConfirmOpen} onClose={() => { if (!resetting) { setResetConfirmOpen(false); setResetError(null); } }}>
        <Card className="p-6 w-[90vw] max-w-md space-y-4 text-neutral-900 dark:text-neutral-100">
          <div className="text-lg font-semibold">Reset demo data?</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            This will delete all demo records and reseed fresh demo data.
          </div>
          {resetError && (
            <div className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded p-2">
              {resetError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setResetConfirmOpen(false); setResetError(null); }} disabled={resetting}>Cancel</Button>
            <Button onClick={onResetDemo} disabled={resetting}>{resetting ? 'Resetting…' : 'Reset Demo Data'}</Button>
          </div>
        </Card>
      </Modal>
    </div>
  );
}

export function TeacherHeaderRight() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <TeacherHeaderRightDemo /> : <TeacherHeaderRightWorkOS />;
}
