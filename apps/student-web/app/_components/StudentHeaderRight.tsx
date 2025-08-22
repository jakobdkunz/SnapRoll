"use client";
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@snaproll/api-client';

type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

export function StudentHeaderRight() {
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.studentId');
    async function load(idVal: string) {
      try {
        const data = await apiFetch<StudentProfile>(`/api/students/${idVal}`);
        const full = `${data.student.firstName} ${data.student.lastName}`;
        setName(full);
        localStorage.setItem('snaproll.studentName', full);
        localStorage.setItem('snaproll.studentEmail', data.student.email);
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
    localStorage.removeItem('snaproll.studentId');
    localStorage.removeItem('snaproll.studentName');
    localStorage.removeItem('snaproll.studentEmail');
    router.push('/');
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen((v) => !v)} className="text-sm text-slate-600 hover:text-slate-900 transition">
        {name || 'Profile'}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-md">
          <Link href="/profile" className="block px-3 py-2 text-sm hover:bg-slate-50">My Profile</Link>
          <button onClick={logout} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50">Log Out</button>
        </div>
      )}
    </div>
  );
}


