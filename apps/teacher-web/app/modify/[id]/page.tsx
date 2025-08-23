"use client";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, TextInput, Skeleton } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';
import { isValidEmail } from '@snaproll/lib';
import { HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2';
import Papa from 'papaparse';

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
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

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

  function guessNameParts(fullName: string): { firstName: string; lastName: string } {
    const name = fullName.trim().replace(/\s+/g, ' ');
    if (!name) return { firstName: 'Student', lastName: 'Unknown' };
    const parts = name.split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
    // Assume last token is last name, rest first name(s)
    const lastName = parts.pop() as string;
    return { firstName: parts.join(' '), lastName };
  }

  async function onImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    setImporting(true);
    try {
      const parsed = await new Promise<Papa.ParseResult<Record<string, unknown>>>((resolve, reject) => {
        Papa.parse<Record<string, unknown>>(file, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
      });
      const rows: Record<string, string>[] = (parsed.data as Record<string, unknown>[]).map((r) => (r || {} as unknown) as Record<string, string>);
      if (rows.length === 0) {
        alert('No rows found in CSV.');
        return;
      }
      // Determine email column: first column where any row contains @
      const headers = parsed.meta.fields || Object.keys(rows[0] || {});
      const emailHeader = headers.find((h) => rows.some((r) => String(r[h] || '').includes('@')));
      if (!emailHeader) {
        alert('Could not find an email column (no values with @).');
        return;
      }
      // Try to find first and last name columns
      const lowerHeaders = headers.map((h) => h.toLowerCase());
      const firstHeader = headers[lowerHeaders.findIndex((h) => /first/.test(h))] || null;
      const lastHeader = headers[lowerHeaders.findIndex((h) => /last/.test(h))] || null;
      const nameHeader = headers[lowerHeaders.findIndex((h) => /(name|full)/.test(h))] || null;

      let added = 0;
      for (const row of rows) {
        const emailVal = String(row[emailHeader] || '').trim().toLowerCase();
        if (!isValidEmail(emailVal)) continue;
        let first = '';
        let last = '';
        if (firstHeader && lastHeader) {
          first = String(row[firstHeader] || '').trim();
          last = String(row[lastHeader] || '').trim();
        } else if (nameHeader) {
          const guess = guessNameParts(String(row[nameHeader] || ''));
          first = guess.firstName; last = guess.lastName;
        } else {
          const beforeAt = emailVal.split('@')[0].replace(/[._-]+/g, ' ');
          const guess = guessNameParts(beforeAt);
          first = guess.firstName; last = guess.lastName;
        }
        if (!first && !last) {
          const guess = guessNameParts(emailVal.split('@')[0]);
          first = guess.firstName; last = guess.lastName;
        }
        try {
          await apiFetch(`/api/sections/${params.id}/students`, {
            method: 'POST',
            body: JSON.stringify({ email: emailVal, firstName: first || 'Student', lastName: last || '' }),
          });
          added += 1;
        } catch (_ignored) {
          // continue with others
        }
      }
      await load();
      setImportMessage(`Imported ${added} ${added === 1 ? 'student' : 'students'}.`);
    } catch (_ignored) {
      alert('Failed to import CSV.');
    } finally {
      setImporting(false);
      // reset input value so the same file can be chosen again
      e.target.value = '';
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
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-500">{students.length} student{students.length === 1 ? '' : 's'}</div>
            <label className="relative inline-flex items-center">
              <input type="file" accept=".csv,text/csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onImportCsv} disabled={importing} />
              <Button variant="ghost" className="pointer-events-none">{importing ? 'Importing…' : 'Import CSV'}</Button>
            </label>
          </div>
        </div>
        {importMessage && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 mb-3">{importMessage}</div>
        )}
        <div className="space-y-3">
          {students.length === 0 ? (
            <div className="text-sm text-slate-500 p-3 border rounded-lg bg-white/50">No students yet. Add one below.</div>
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
