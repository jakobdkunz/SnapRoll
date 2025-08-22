"use client";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, TextInput } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

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

  async function handleAdd() {
    if (!newEmail.trim()) return;
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
    if (!editEmail.trim() || !editFirstName.trim() || !editLastName.trim()) return;
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
      <Card className="p-6">
        <div className="mb-4 font-medium">Roster</div>
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.id} className="p-2 border rounded flex flex-col sm:flex-row sm:items-center gap-2">
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
                  <div className="sm:ml-auto flex gap-2 flex-wrap">
                    <Button variant="ghost" onClick={() => beginEdit(s)}>Edit</Button>
                    <Button variant="ghost" onClick={() => removeStudent(s.id)}>Remove</Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <div className="font-medium">Add Student</div>
          <TextInput placeholder="Email" value={newEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNewEmail(e.target.value); setNeedNames(false); setNewFirstName(''); setNewLastName(''); }} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
          {needNames && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              No existing student found. Please enter their name to continue
            </div>
          )}
          {needNames && (
            <div className="flex gap-2">
              <TextInput placeholder="First name" value={newFirstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFirstName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
              <TextInput placeholder="Last name" value={newLastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLastName(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
            </div>
          )}
          <Button onClick={handleAdd}>Add Student</Button>
        </div>
      </Card>
    </div>
  );
}
