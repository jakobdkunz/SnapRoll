"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@snaproll/api-client';
import { Modal, Card, Button, TextInput } from '@snaproll/ui';
import { HiOutlineUserCircle, HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';

type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

export function StudentHeaderRight() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    const id = localStorage.getItem('snaproll.studentId');
    setStudentId(id);
    const cachedName = localStorage.getItem('snaproll.studentName');
    const cachedEmail = localStorage.getItem('snaproll.studentEmail');
    if (cachedName) setName(cachedName);
    if (cachedEmail) setEmail(cachedEmail);
  }, []);

  useEffect(() => {
    async function load(idVal: string) {
      try {
        const data = await apiFetch<StudentProfile>(`/api/students/${idVal}`);
        const full = `${data.student.firstName} ${data.student.lastName}`;
        setName(full);
        setFirstName(data.student.firstName);
        setLastName(data.student.lastName);
        setEmail(data.student.email);
        localStorage.setItem('snaproll.studentName', full);
        localStorage.setItem('snaproll.studentEmail', data.student.email);
      } catch {
        // ignore
      }
    }
    if (studentId) load(studentId);
  }, [studentId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); setProfileOpen(false); }
    }
    function handleFocus() {
      const id = localStorage.getItem('snaproll.studentId');
      setStudentId(id);
    }
    function handleStorage() {
      const id = localStorage.getItem('snaproll.studentId');
      setStudentId(id);
      if (!id) {
        setName(''); setFirstName(''); setLastName(''); setEmail(''); setOpen(false); setProfileOpen(false);
      }
    }
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

  function logout() {
    localStorage.removeItem('snaproll.studentId');
    localStorage.removeItem('snaproll.studentName');
    localStorage.removeItem('snaproll.studentEmail');
    setStudentId(null);
    setName(''); setFirstName(''); setLastName(''); setEmail('');
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
        {name || 'Profile'}
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
            <TextInput value={email} disabled />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>Close</Button>
          </div>
        </Card>
      </Modal>
    </div>
  );
}


