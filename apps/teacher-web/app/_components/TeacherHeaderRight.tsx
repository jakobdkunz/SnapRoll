"use client";
import { HiOutlineUserCircle, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { convexApi, api } from '@snaproll/convex-client';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useQuery, useMutation } from 'convex/react';
import { useClerk } from '@clerk/nextjs';
import { Modal, Card, Button, TextInput } from '@snaproll/ui';

type TeacherProfile = { teacher: { id: string; email: string; firstName: string; lastName: string } };

export function TeacherHeaderRight() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<Id<'users'> | null>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  // Convex hooks
  const currentUser = useQuery(api.functions.auth.getCurrentUser);
  const teacher = useQuery(api.functions.users.get, currentUser?._id ? { id: currentUser._id } : "skip");
  const updateUser = useMutation(api.functions.users.update);
  const generateDemo = useMutation(api.functions.demo.generateDemoData);

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

  // Update form fields when teacher data loads
  useEffect(() => {
    if (teacher) {
      setFirstName(teacher.firstName);
      setLastName(teacher.lastName);
    }
  }, [teacher]);

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

  async function onGenerateDemo() {
    if (!devMode) return;
    setGenerating(true);
    try {
      const total = pctPresent + pctPresentManual + pctAbsentManual + pctBlank + pctNotEnrolledManual;
      if (total !== 100) {
        alert("Percentages must add up to 100%");
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
      });
      alert("Demo data generated");
    } finally {
      setGenerating(false);
    }
  }

  const { signOut } = useClerk();
  function logout() {
    try { signOut().catch(() => {}); } catch {}
    setTeacherId(null);
    setFirstName(''); setLastName('');
    setOpen(false); setProfileOpen(false);
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

  if (!teacherId) {
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
                    {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Profile'}
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
          <div className="space-y-2 text-left">
            <label className="text-sm text-slate-600">First name</label>
            <TextInput value={firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-slate-600">Last name</label>
            <TextInput value={lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-sm text-slate-600">Email</label>
            <TextInput value={teacher?.email || ''} disabled />
            <div className="text-xs text-slate-500">To change your email, please contact support.</div>
          </div>
          {teacherId && (
            <div className="text-xs text-slate-500">User ID: {teacherId}</div>
          )}

          {devMode && (
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold">Developer Tools</div>
                <Button variant="secondary" onClick={() => setDevOpen(!devOpen)}>
                  {devOpen ? 'Hide' : 'Show'}
                </Button>
              </div>
              {devOpen && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1 text-left">
                    <label className="text-sm text-slate-600">Demo section name</label>
                    <TextInput value={sectionTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSectionTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-slate-600">Students</label>
                      <TextInput type="number" value={studentCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentCount(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-slate-600">Days (back from today)</label>
                      <TextInput type="number" value={daysBack} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDaysBack(Number(e.target.value || 0))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-slate-600">% Present</label>
                      <TextInput type="number" value={pctPresent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctPresent(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-slate-600">% Present (manual)</label>
                      <TextInput type="number" value={pctPresentManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctPresentManual(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-slate-600">% Absent (manual)</label>
                      <TextInput type="number" value={pctAbsentManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctAbsentManual(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-slate-600">% Blank (never manual)</label>
                      <TextInput type="number" value={pctBlank} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctBlank(Number(e.target.value || 0))} />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-sm text-slate-600">% Not Enrolled (manual)</label>
                      <TextInput type="number" value={pctNotEnrolledManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctNotEnrolledManual(Number(e.target.value || 0))} />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">Percentages must add to 100%.</div>
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
    </div>
  );
}


