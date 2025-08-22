"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, TextInput } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type TeacherProfile = { teacher: { id: string; email: string; firstName: string; lastName: string } };

export default function TeacherProfilePage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
    async function load(idVal: string) {
      setLoading(true);
      try {
        const data = await apiFetch<TeacherProfile>(`/api/teachers/${idVal}`);
        setFirstName(data.teacher.firstName);
        setLastName(data.teacher.lastName);
        setEmail(data.teacher.email);
      } finally {
        setLoading(false);
      }
    }
    if (id) load(id);
  }, []);

  async function onSave() {
    if (!teacherId) return;
    setSaving(true);
    try {
      const updated = await apiFetch<TeacherProfile>(`/api/teachers/${teacherId}`, {
        method: 'PATCH',
        body: JSON.stringify({ firstName, lastName }),
      });
      const name = `${updated.teacher.firstName} ${updated.teacher.lastName}`;
      localStorage.setItem('snaproll.teacherName', name);
      try { router.refresh(); } catch {
        // Ignore refresh errors, fallback to reload
      }
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!teacherId) return null;
  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">Your Profile</div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">First name</label>
          <TextInput value={firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && firstName.trim() && lastName.trim() && !saving) { e.preventDefault(); onSave(); } }} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Last name</label>
          <TextInput value={lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && firstName.trim() && lastName.trim() && !saving) { e.preventDefault(); onSave(); } }} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Email</label>
          <TextInput value={email} disabled />
        </div>
        <Button onClick={onSave} disabled={saving || !firstName.trim() || !lastName.trim()}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Card>
    </div>
  );
}


