"use client";
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@snaproll/api-client';
import { Modal, Card, Button, TextInput } from '@snaproll/ui';

type TeacherProfile = { teacher: { id: string; email: string; firstName: string; lastName: string } };

export function TeacherHeaderRight() {
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    async function load(idVal: string) {
      try {
        const data = await apiFetch<TeacherProfile>(`/api/teachers/${idVal}`);
        const full = `${data.teacher.firstName} ${data.teacher.lastName}`;
        setName(full);
        setFirstName(data.teacher.firstName);
        setLastName(data.teacher.lastName);
        setEmail(data.teacher.email);
        localStorage.setItem('snaproll.teacherName', full);
        localStorage.setItem('snaproll.teacherEmail', data.teacher.email);
      } catch {
        // ignore
      }
    }
    if (id) load(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); setProfileOpen(false); }
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

  async function saveProfile() {
    const id = localStorage.getItem('snaproll.teacherId');
    if (!id || !firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    try {
      const updated = await apiFetch<TeacherProfile>(`/api/teachers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() })
      });
      const full = `${updated.teacher.firstName} ${updated.teacher.lastName}`;
      setName(full);
      localStorage.setItem('snaproll.teacherName', full);
      setProfileOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem('snaproll.teacherId');
    localStorage.removeItem('snaproll.teacherName');
    localStorage.removeItem('snaproll.teacherEmail');
    router.push('/');
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-slate-600 hover:text-slate-900 transition">
        {name || 'Profile'}
      </button>
      <div className={`absolute right-0 mt-2 w-44 rounded-lg border bg-white shadow-md origin-top-right transition-all duration-150 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <button className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => { setOpen(false); setProfileOpen(true); }}>My Profile</button>
        <button onClick={() => { setOpen(false); logout(); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50">Log Out</button>
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
            <TextInput value={email} disabled />
            <div className="text-xs text-slate-500">To change your email, please contact support.</div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setProfileOpen(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={saving || !firstName.trim() || !lastName.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </Card>
      </Modal>
    </div>
  );
}


