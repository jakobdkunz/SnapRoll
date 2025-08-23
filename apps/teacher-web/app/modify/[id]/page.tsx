"use client";
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, TextInput, Skeleton, Modal } from '@snaproll/ui';
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

  // CSV mapping modal state
  const [mappingOpen, setMappingOpen] = useState(false);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [dataStartRowIndex, setDataStartRowIndex] = useState(0);
  const [emailColIndex, setEmailColIndex] = useState<number>(-1);
  const [useFullName, setUseFullName] = useState(false);
  const [firstNameColIndex, setFirstNameColIndex] = useState<number | null>(null);
  const [lastNameColIndex, setLastNameColIndex] = useState<number | null>(null);
  const [fullNameColIndex, setFullNameColIndex] = useState<number | null>(null);

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
      const parsed = await new Promise<Papa.ParseResult<string[][]>>((resolve, reject) => {
        Papa.parse<string[]>(file, { header: false, skipEmptyLines: true, complete: (res) => resolve(res as unknown as Papa.ParseResult<string[][]>), error: reject });
      });
      const allRows: string[][] = (parsed.data as unknown as string[][]).map((r) => (Array.isArray(r) ? r : []));
      if (allRows.length === 0) {
        alert('No rows found in CSV.');
        return;
      }
      const maxCols = allRows.reduce((m, r) => Math.max(m, r.length), 0);
      // detect email column as the column with the most valid-looking emails
      const emailScores = new Array(maxCols).fill(0).map((_, c) =>
        allRows.reduce((count, r) => {
          const v = String(r[c] || '').trim().toLowerCase();
          return count + (isValidEmail(v) ? 1 : 0);
        }, 0)
      );
      const bestEmailIdx = emailScores.reduce((best, score, idx) => (score > emailScores[best] ? idx : best), 0);
      if (emailScores[bestEmailIdx] === 0) {
        alert('Could not find an email column (no values with @).');
        return;
      }
      const firstRow = allRows[0] || [];
      const firstRowHasEmail = isValidEmail(String(firstRow[bestEmailIdx] || '').trim().toLowerCase());
      // If first row has an email, it's data; otherwise, it might be headers
      const startIndex = firstRowHasEmail ? 0 : 1;
      // Create column labels
      const inferredColumns: string[] = [];
      if (!firstRowHasEmail) {
        for (let c = 0; c < maxCols; c += 1) {
          inferredColumns.push(String(firstRow[c] || `Column ${c + 1}`));
        }
      } else {
        for (let c = 0; c < maxCols; c += 1) {
          inferredColumns.push(`Column ${c + 1}`);
        }
      }

      // Try to auto-detect names from headers if present
      const lowerHeaders = inferredColumns.map((h) => String(h).toLowerCase());
      const autoFirstIdx = !firstRowHasEmail ? lowerHeaders.findIndex((h) => /(^|\b)first(\b|name)/.test(h)) : -1;
      const autoLastIdx = !firstRowHasEmail ? lowerHeaders.findIndex((h) => /(^|\b)last(\b|name)/.test(h)) : -1;
      const autoFullIdx = !firstRowHasEmail ? lowerHeaders.findIndex((h) => /(full\s*name|name)/.test(h)) : -1;

      // If we have clear first & last, import immediately; if we have clear full name, import immediately; else prompt mapping
      if (autoFirstIdx >= 0 && autoLastIdx >= 0 && autoFirstIdx !== autoLastIdx) {
        await performImportFromParsed(allRows, startIndex, bestEmailIdx, { mode: 'separate', firstIdx: autoFirstIdx, lastIdx: autoLastIdx });
      } else if (autoFullIdx >= 0 && autoFullIdx !== bestEmailIdx) {
        await performImportFromParsed(allRows, startIndex, bestEmailIdx, { mode: 'full', fullIdx: autoFullIdx });
      } else {
        // open modal to map
        setCsvColumns(inferredColumns);
        setCsvRows(allRows);
        setDataStartRowIndex(startIndex);
        setEmailColIndex(bestEmailIdx);
        setUseFullName(false);
        setFirstNameColIndex(null);
        setLastNameColIndex(null);
        setFullNameColIndex(null);
        setMappingOpen(true);
        return; // keep importing state true; confirm will continue
      }
      await load();
      setImportMessage('Import complete.');
    } catch (_ignored) {
      alert('Failed to import CSV.');
    } finally {
      setImporting(false);
      // reset input value so the same file can be chosen again
      e.target.value = '';
    }
  }

  async function performImportFromParsed(
    allRows: string[][],
    startIndex: number,
    emailIdx: number,
    mapping: { mode: 'separate'; firstIdx: number; lastIdx: number } | { mode: 'full'; fullIdx: number }
  ) {
    let added = 0;
    for (let i = startIndex; i < allRows.length; i += 1) {
      const row = allRows[i] || [];
      const emailVal = String(row[emailIdx] || '').trim().toLowerCase();
      if (!isValidEmail(emailVal)) continue;
      let first = '';
      let last = '';
      if (mapping.mode === 'separate') {
        first = String(row[mapping.firstIdx] || '').trim();
        last = String(row[mapping.lastIdx] || '').trim();
      } else {
        const guess = guessNameParts(String(row[mapping.fullIdx] || ''));
        first = guess.firstName; last = guess.lastName;
      }
      if (!first && !last) {
        const beforeAt = emailVal.split('@')[0].replace(/[._-]+/g, ' ');
        const guess = guessNameParts(beforeAt);
        first = guess.firstName; last = guess.lastName;
      }
      try {
        await apiFetch(`/api/sections/${params.id}/students`, {
          method: 'POST',
          body: JSON.stringify({ email: emailVal, firstName: first || 'Student', lastName: last || '' }),
        });
        added += 1;
      } catch (_ignored) {
        // continue
      }
    }
    await load();
    setImportMessage(`Imported ${added} ${added === 1 ? 'student' : 'students'}.`);
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
      {/* Mapping Modal */}
      {mappingOpen && (
        <Modal open={mappingOpen} onClose={() => { setMappingOpen(false); setImporting(false); }}>
          <div className="w-[min(92vw,720px)] bg-white rounded-xl shadow-xl p-4 sm:p-6">
            <div className="mb-1 text-xs font-semibold tracking-wide text-slate-500">CSV Import</div>
            <div className="text-lg font-semibold">Help us map the name columns</div>
            <div className="text-sm text-slate-600 mt-1 mb-4">
              We detected the email column automatically. Choose how first and last names are provided.
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" className="accent-black" checked={!useFullName} onChange={() => setUseFullName(false)} />
                  <span className="text-sm">Separate columns for first and last name</span>
                </label>
                {!useFullName && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex gap-2 items-center">
                      <label className="text-sm font-medium w-28">First name</label>
                      <select
                        className="border rounded px-2 py-1 text-sm flex-1"
                        value={firstNameColIndex ?? ''}
                        onChange={(e) => setFirstNameColIndex(e.target.value === '' ? null : Number(e.target.value))}
                      >
                        <option value="">Select column…</option>
                        {csvColumns.map((c, i) => (
                          emailColIndex === i ? null : <option key={i} value={i}>{c || `Column ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="text-sm font-medium w-28">Last name</label>
                      <select
                        className="border rounded px-2 py-1 text-sm flex-1"
                        value={lastNameColIndex ?? ''}
                        onChange={(e) => setLastNameColIndex(e.target.value === '' ? null : Number(e.target.value))}
                      >
                        <option value="">Select column…</option>
                        {csvColumns.map((c, i) => (
                          emailColIndex === i ? null : <option key={i} value={i}>{c || `Column ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <label className="inline-flex items-center gap-2">
                  <input type="radio" className="accent-black" checked={useFullName} onChange={() => setUseFullName(true)} />
                  <span className="text-sm">Single full name column</span>
                </label>
                {useFullName && (
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium w-28">Full name</label>
                    <select
                      className="border rounded px-2 py-1 text-sm flex-1"
                      value={fullNameColIndex ?? ''}
                      onChange={(e) => setFullNameColIndex(e.target.value === '' ? null : Number(e.target.value))}
                    >
                      <option value="">Select column…</option>
                      {csvColumns.map((c, i) => (
                        emailColIndex === i ? null : <option key={i} value={i}>{c || `Column ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1">Preview (first few rows)</div>
                <div className="max-h-48 overflow-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        {csvColumns.map((c, i) => (
                          i === emailColIndex ? null : <th key={i} className="text-left px-2 py-1 border-b whitespace-nowrap">{c || `Column ${i + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(dataStartRowIndex, dataStartRowIndex + 5).map((r, ri) => (
                        <tr key={ri} className="odd:bg-slate-50">
                          {csvColumns.map((_, ci) => (
                            ci === emailColIndex ? null : <td key={ci} className="px-2 py-1 border-b whitespace-nowrap">{String(r[ci] || '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => { setMappingOpen(false); setImporting(false); }}>Cancel</Button>
                <Button onClick={async () => {
                  if (emailColIndex < 0) { alert('We could not detect an email column.'); return; }
                  if (!useFullName) {
                    if (firstNameColIndex == null || lastNameColIndex == null) { alert('Please select both first and last name columns.'); return; }
                    await performImportFromParsed(csvRows, dataStartRowIndex, emailColIndex, { mode: 'separate', firstIdx: firstNameColIndex, lastIdx: lastNameColIndex });
                  } else {
                    if (fullNameColIndex == null) { alert('Please select the full name column.'); return; }
                    await performImportFromParsed(csvRows, dataStartRowIndex, emailColIndex, { mode: 'full', fullIdx: fullNameColIndex });
                  }
                  setMappingOpen(false);
                  setImporting(false);
                }}>Import</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
