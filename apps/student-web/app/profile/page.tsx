"use client";
import { useEffect, useState } from 'react';
import { Card, TextInput } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

export default function StudentProfilePage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.studentId');
    setStudentId(id);
    async function load(idVal: string) {
      setLoading(true);
      try {
        const data = await apiFetch<StudentProfile>(`/api/students/${idVal}`);
        setFirstName(data.student.firstName);
        setLastName(data.student.lastName);
        setEmail(data.student.email);
      } finally {
        setLoading(false);
      }
    }
    if (id) load(id);
  }, []);

  if (!studentId) return null;
  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">Your Profile</div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">First name</label>
          <TextInput value={firstName} disabled />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Last name</label>
          <TextInput value={lastName} disabled />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Email</label>
          <TextInput value={email} disabled />
        </div>
      </Card>
    </div>
  );
}


