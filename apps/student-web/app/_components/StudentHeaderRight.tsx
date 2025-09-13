"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@snaproll/convex-client';
import { useMutation } from 'convex/react';
import { useQuery } from 'convex/react';
import { useClerk } from '@clerk/nextjs';
import { Modal, Card, Button, TextInput } from '@snaproll/ui';
import { HiOutlineUserCircle, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';

// type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

export function StudentHeaderRight() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [devMsg, setDevMsg] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convex hooks
  const currentUser = useQuery(api.functions.auth.getCurrentUser);

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

  const { signOut } = useClerk();
  const resetRateLimit = useMutation(api.functions.attendance.resetCheckinRateLimit);
  const devMode = (process.env.NEXT_PUBLIC_DEV_MODE ?? "false") === "true";
  function logout() {
    setStudentId(null);
    setFirstName(''); setLastName('');
    setOpen(false); setProfileOpen(false);
    try { signOut().catch(() => {}); } catch (e) { void e; }
    router.push('/');
  }

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="opacity-0 pointer-events-none select-none">
        <button className="text-sm">Profile</button>
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
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-slate-600 hover:text-slate-900 transition inline-flex items-center gap-2">
        <HiOutlineUserCircle className="h-5 w-5" />
        {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Profile'}
      </button>
      <div className={`absolute right-0 mt-2 w-44 rounded-lg border bg-white shadow-md origin-top-right transition-all duration-150 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2" onClick={() => { setOpen(false); setProfileOpen(true); }}>
          <HiOutlineUserCircle className="h-4 w-4" /> My Profile
        </button>
        <button onClick={() => { setOpen(false); logout(); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 inline-flex items-center gap-2">
          <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Log Out
        </button>
      </div>

      <Modal open={profileOpen} onClose={() => setProfileOpen(false)}>
        <Card className="p-6 w-[90vw] max-w-md space-y-4">
          <div className="text-lg font-semibold">Your Profile</div>
          <div className="text-sm text-slate-600">These settings are managed by your organization.</div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-slate-600">First name</label>
            <TextInput value={firstName} disabled />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-slate-600">Last name</label>
            <TextInput value={lastName} disabled />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-slate-600">Email</label>
            <TextInput value={currentUser?.email || ''} disabled />
          </div>
          {studentId && (
            <div className="text-xs text-slate-500">User ID: {studentId}</div>
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
                <div className="mt-2 text-xs text-slate-600">{devMsg}</div>
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


