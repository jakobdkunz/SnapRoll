"use client";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, TextInput, Skeleton } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';
import { isValidEmail } from '@snaproll/lib';
import { HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2';

type Student = { id: string; email: string; firstName: string; lastName: string };

export default function ModifyPage() {
  const params = useParams<{ id: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [needNames, setNeedNames] = useState(false);
  const [sectionTitle, setSectionTitle] = useState<string>('Roster');
  const [sectionGradient, setSectionGradient] = useState<string>('gradient-1');

  async function load() {
    try {
      const roster = await apiFetch<{ students: Student[] }>(`/api/sections/${params.id}/students`);
      setStudents(roster.students);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load students';
      alert(errorMessage);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    async function loadSection() {
      try {
        const res = await apiFetch<{ section: { title: string; gradient: string } }>(`/api/sections/${params.id}`);
        setSectionTitle(res.section.title);
        setSectionGradient(res.section.gradient);
      } catch (err) {
        console.warn('Failed to load section details', err);
      }
    }
    loadSection();
  }, [params.id]);

  async function handleAdd() {
    if (!newEmail.trim() || !isValidEmail(newEmail.trim())) {
      alert('Please enter a valid email address.');
      return;
    }
    try {
      if (!needNames) {
        const lookup = await apiFetch<{ found: boolean; student?: { firstName: string; lastName: string } }>(
          '/api/students/lookup',
          { method: 'POST', body: JSON.stringify({ email: newEmail }) }
        );
        if (lookup.found) {
          await apiFetch(`/api/sections/${params.id}/students`, {
            method: 'POST',
            body: JSON.stringify({ email: newEmail, firstName: lookup.student!.firstName, lastName: lookup.student!.lastName }),
          });
          setNewEmail('');
          setNewFirstName('');
          setNewLastName('');
          setNeedNames(false);
          load();
        } else {
          setNeedNames(true);
        }
      } else {
        if (!newFirstName.trim() || !newLastName.trim()) return;
        await apiFetch(`/api/sections/${params.id}/students`, {
          method: 'POST',
          body: JSON.stringify({ email: newEmail, firstName: newFirstName.trim(), lastName: newLastName.trim() }),
        });
        setNewEmail('');
        setNewFirstName('');
        setNewLastName('');
        setNeedNames(false);
        load();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add student';
      alert(errorMessage);
    }
  }

  function beginEdit(s: Student) {
    setEditId(s.id);
    setEditEmail(s.email);
    setEditFirstName(s.firstName);
    setEditLastName(s.lastName);
  }

  function cancelEdit() {
    setEditId(null);
    setEditEmail('');
    setEditFirstName('');
    setEditLastName('');
  }

  async function saveEdit(studentId: string) {
    if (!editEmail.trim() || !isValidEmail(editEmail.trim()) || !editFirstName.trim() || !editLastName.trim()) {
      alert('Please enter a valid email and name.');
      return;
    }
    try {
      await apiFetch(`/api/sections/${params.id}/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ email: editEmail, firstName: editFirstName, lastName: editLastName }),
      });
      cancelEdit();
      load();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update student';
      alert(errorMessage);
    }
  }

  async function removeStudent(studentId: string) {
    try {
      await apiFetch(`/api/sections/${params.id}/students/${studentId}`, { method: 'DELETE' });
      load();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove student';
      alert(errorMessage);
    }
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-xl overflow-hidden ${sectionGradient} relative`}> 
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative grid place-items-center text-white py-8 sm:py-10">
          <div className="font-futuristic font-bold text-xl sm:text-2xl text-center px-3 leading-tight">{sectionTitle}</div>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="font-medium text-lg">Roster</div>
          <div className="text-sm text-slate-500">{students.length} student{students.length === 1 ? '' : 's'}</div>
        </div>
        <div className="space-y-3">
          {students.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 border rounded-lg bg-white/50 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-5 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <div className="sm:ml-auto w-full sm:w-auto grid grid-cols-2 gap-2">
                  <Skeleton className="h-9 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </div>
            ))
          ) : students.map((s) => (
            <div key={s.id} className="p-3 border rounded-lg bg-white/50 flex flex-col sm:flex-row sm:items-center gap-3">
              {editId === s.id ? (
                <>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <TextInput placeholder="Email" value={editEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEmail(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(s.id); } }} />
                    <TextInput placeholder="First name" value={editFirstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditFirstName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(s.id); } }} />
                    <TextInput placeholder="Last name" value={editLastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditLastName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(s.id); } }} />
                  </div>
                  <div className="sm:ml-auto flex gap-2 flex-wrap">
                    <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                    <Button onClick={() => saveEdit(s.id)}>Save</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.firstName} {s.lastName}</div>
                    <div className="text-sm text-slate-500 truncate">{s.email}</div>
                  </div>
                  <div className="sm:ml-auto w-full sm:w-auto grid grid-cols-2 gap-2">
                    <Button variant="ghost" onClick={() => beginEdit(s)} className="inline-flex items-center justify-center gap-2"><HiOutlinePencilSquare className="h-5 w-5" /> Edit</Button>
                    <Button variant="ghost" onClick={() => removeStudent(s.id)} className="inline-flex items-center justify-center gap-2">
                      <HiOutlineTrash className="h-5 w-5" /> Remove
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          <div className="font-medium">Add Student</div>
          <TextInput placeholder="Email" value={newEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNewEmail(e.target.value); setNeedNames(false); setNewFirstName(''); setNewLastName(''); }} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
          {needNames && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              No existing student found. Please enter their name to continue
            </div>
          )}
          {needNames && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <TextInput placeholder="First name" value={newFirstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFirstName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
              <TextInput placeholder="Last name" value={newLastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLastName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
            </div>
          )}
          <Button className="w-full sm:w-auto" onClick={handleAdd}>Add Student</Button>
        </div>
      </Card>
    </div>
  );
}
