"use client";
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@snaproll/api-client';

type TeacherProfile = { teacher: { id: string; email: string; firstName: string; lastName: string } };

export function TeacherHeaderRight() {
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    async function load(idVal: string) {
      try {
        const data = await apiFetch<TeacherProfile>(`/api/teachers/${idVal}`);
        const full = `${data.teacher.firstName} ${data.teacher.lastName}`;
        setName(full);
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
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-md">
          <Link href="/profile" className="block px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>My Profile</Link>
          <button onClick={() => { setOpen(false); logout(); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50">Log Out</button>
        </div>
      )}
    </div>
  );
}


