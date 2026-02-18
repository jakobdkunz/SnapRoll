"use client";
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Button, Card, TextInput, Modal, Skeleton } from '@flamelink/ui';
import { RosterRow } from './_components/RosterRow';
import { SectionHeader } from './_components/SectionHeader';
import { ImportCsvModal } from './_components/ImportCsvModal';
import { api } from '../../../../../convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import type { Id } from '@flamelink/convex-client';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { isValidEmail } from '@flamelink/lib';
import { HiOutlineTrash, HiOutlineArrowUpTray } from 'react-icons/hi2';
import Papa from 'papaparse';
import { useDemoUser } from '../../_components/DemoUserContext';

type Student = { id: Id<'users'>; email: string; firstName: string; lastName: string };
type SectionAccessStatus =
  | { status: "ok"; section: { title?: string; gradient?: string } }
  | { status: "forbidden" | "not_found" };

export default function ModifyPage() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  return isDemoMode ? <ModifyPageDemo /> : <ModifyPageWorkOS />;
}

function ModifyPageDemo() {
  const { demoUserEmail } = useDemoUser();
  return <ModifyPageCore canUpsert={false} demoUserEmail={demoUserEmail} />;
}

function ModifyPageWorkOS() {
  const { user, loading } = useAuth();
  const canUpsert = !loading && !!user;
  // Pass user info for upsert (WorkOS JWT doesn't include email, but user object does)
  const userInfo = user ? {
    email: user.email ?? undefined,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
  } : undefined;
  return <ModifyPageCore canUpsert={canUpsert} userInfo={userInfo} />;
}

function ModifyPageCore({ canUpsert, userInfo, demoUserEmail }: { canUpsert: boolean; userInfo?: { email?: string; firstName?: string; lastName?: string }; demoUserEmail?: string }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');

  // Convex hooks
  // Ensure the current Clerk user is provisioned in Convex before running protected queries
  const currentUser = useQuery(api.functions.auth.getCurrentUser, { demoUserEmail });
  const demoArgs = useMemo(
    () => ((isDemoMode && demoUserEmail) ? { demoUserEmail } : {}),
    [isDemoMode, demoUserEmail]
  );
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  useEffect(() => {
    if (!canUpsert) return;
    if (currentUser === undefined) return; // still loading
    if (!currentUser) {
      upsertUser({ 
        role: 'TEACHER',
        email: userInfo?.email,
        firstName: userInfo?.firstName,
        lastName: userInfo?.lastName,
      }).catch(() => {});
    }
  }, [canUpsert, currentUser, upsertUser, userInfo]);
  const teacherReady = !!(currentUser && currentUser._id);

  const sectionAccess = useQuery(
    api.functions.sections.getAccessStatus,
    (params.id && teacherReady) ? { id: params.id as Id<'sections'>, ...demoArgs } : "skip"
  ) as SectionAccessStatus | undefined;
  const section = sectionAccess?.status === "ok" ? sectionAccess.section : null;
  const enrollments = useQuery(
    api.functions.enrollments.getBySection,
    (params.id && teacherReady && sectionAccess?.status === "ok") ? { sectionId: params.id as Id<'sections'>, ...demoArgs } : "skip"
  );
  const allStudents = useQuery(api.functions.users.list, teacherReady ? { role: "STUDENT", ...demoArgs } : "skip");
  
  // Combine enrollments with student data
  const students = useMemo(() => {
    if (!enrollments || !allStudents) return [];
    return enrollments.map((enrollment: { studentId: Id<'users'> }) => {
      const student = allStudents.find((s: { _id: Id<'users'>; email: string; firstName: string; lastName: string }) => s._id === enrollment.studentId);
      return student ? {
        id: student._id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName
      } : null;
    }).filter(Boolean) as Student[];
  }, [enrollments, allStudents]);

  // Convex mutations
  const createUser = useMutation(api.functions.users.create);
  const createEnrollment = useMutation(api.functions.enrollments.create);
  const removeEnrollment = useMutation(api.functions.enrollments.remove);
  const updateUser = useMutation(api.functions.users.update);

  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [needNames, setNeedNames] = useState(false);
  const [sectionTitle, setSectionTitle] = useState<string>('Roster');
  const [sectionGradient, setSectionGradient] = useState<string>('gradient-1');

  // Update section data when Convex query returns
  useEffect(() => {
    if (sectionAccess?.status === "ok" && section) {
      setSectionTitle(section.title || 'Roster');
      setSectionGradient(section.gradient || 'gradient-1');
      setSectionLoaded(true);
    } else if (sectionAccess && sectionAccess.status !== "ok") {
      setSectionLoaded(false);
    }
  }, [sectionAccess, section]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importWorking, setImportWorking] = useState(false);

  // CSV mapping modal state
  const [mappingOpen, setMappingOpen] = useState(false);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [dataStartRowIndex, setDataStartRowIndex] = useState(0);
  const [emailColIndex, setEmailColIndex] = useState<number>(-1);
  // mapping flow state
  const [mappingStep, setMappingStep] = useState<'promptKind' | 'review'>('review');
  const [promptColumnIdx, setPromptColumnIdx] = useState<number | null>(null);
  type ColumnRole = 'email' | 'first' | 'last' | 'full' | 'other';
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([]);
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [dropdownBackdropKey, setDropdownBackdropKey] = useState(0);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const [sectionLoaded, setSectionLoaded] = useState(false);
  
  type LastAction =
    | { type: 'remove_one'; snapshot: Student[]; label: string }
    | { type: 'remove_all'; snapshot: Student[]; label: string }
    | { type: 'import'; snapshot: Student[]; label: string };
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoWorking, setUndoWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function showDialogError(message: string) {
    setDialogError(message);
  }

  function validateRolesForImport(roles: ColumnRole[]): { ok: boolean; message?: string } {
    const emailCount = roles.filter((r) => r === 'email').length;
    const fullCount = roles.filter((r) => r === 'full').length;
    const firstCount = roles.filter((r) => r === 'first').length;
    const lastCount = roles.filter((r) => r === 'last').length;
    if (emailCount !== 1) return { ok: false, message: 'Exactly one Emails column is required.' };
    if (fullCount > 0) {
      if (fullCount !== 1) return { ok: false, message: 'Only one Full names column is allowed.' };
      if (firstCount > 0 || lastCount > 0) return { ok: false, message: 'Cannot mix Full names with separate First/Last.' };
    } else {
      if (firstCount !== 1 || lastCount !== 1) return { ok: false, message: 'One First names and one Last names column are required.' };
    }
    return { ok: true };
  }

  function isFullNameColumnValid(idx: number): boolean {
    const sample = csvRows.slice(dataStartRowIndex, dataStartRowIndex + 10).map((r) => String(r[idx] || ''));
    return sample.some((v) => /[A-Za-z]\s+[A-Za-z]/.test(v));
  }

  async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
    const queue = [...items];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(limit, queue.length); i += 1) {
      workers.push((async function loop() {
        while (queue.length) {
          const next = queue.shift() as T;
          try { await worker(next); } catch { /* continue */ }
        }
      })());
    }
    await Promise.all(workers);
  }



  async function handleAdd() {
    if (!newEmail.trim() || !isValidEmail(newEmail.trim())) {
      showDialogError('Please enter a valid email address.');
      return;
    }
    try {
      if (!needNames) {
        // Check if student exists by email
        const existingStudent = allStudents?.find((s: { _id: Id<'users'>; email: string; firstName: string; lastName: string }) => s.email.toLowerCase() === newEmail.trim().toLowerCase());
        if (existingStudent) {
          // Student exists, just enroll them
          await createEnrollment({ sectionId: params.id as Id<'sections'>, studentId: existingStudent._id, ...demoArgs });
          setNewEmail('');
          setNewFirstName('');
          setNewLastName('');
          setNeedNames(false);
        } else {
          setNeedNames(true);
        }
      } else {
        if (!newFirstName.trim() || !newLastName.trim()) return;
        // Create new student and enroll them
        const studentId = await createUser({
          email: newEmail.trim(),
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          role: "STUDENT",
          ...demoArgs,
        });
        await createEnrollment({ sectionId: params.id as Id<'sections'>, studentId, ...demoArgs });
        setNewEmail('');
        setNewFirstName('');
        setNewLastName('');
        setNeedNames(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add student';
      showDialogError(errorMessage);
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
      showDialogError('Please enter a valid email and name.');
      return;
    }
    try {
      await updateUser({ id: studentId as unknown as Id<'users'>, firstName: editFirstName.trim(), lastName: editLastName.trim(), ...demoArgs });
      cancelEdit();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update student';
      showDialogError(errorMessage);
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
        showDialogError('No rows found in CSV.');
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
        showDialogError('Could not find an email column (no values with @).');
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

      // Name detection per requirements
      // 1) Exclude columns containing numbers in data (header can have numbers)
      const dataRows = allRows.slice(startIndex);
      const containsDigits = (val: string) => /\d/.test(val);
      const nameCandidates: number[] = [];
      for (let c = 0; c < maxCols; c += 1) {
        if (c === bestEmailIdx) continue;
        const nums = dataRows.reduce((acc, r) => acc + (containsDigits(String(r[c] || '')) ? 1 : 0), 0);
        const ratio = dataRows.length === 0 ? 0 : nums / dataRows.length;
        if (ratio <= 0.1) nameCandidates.push(c); // allow a small amount of digits noise
      }

      // 2) If spaces between letters in a column, assume full name
      const spaceRatios = nameCandidates.map((c) => ({
        c,
        ratio: dataRows.length === 0 ? 0 : dataRows.reduce((acc, r) => acc + (String(r[c] || '').trim().includes(' ') ? 1 : 0), 0) / (dataRows.length || 1),
      }));
      const likelyFull = spaceRatios.filter((x) => x.ratio >= 0.6).sort((a, b) => b.ratio - a.ratio);

      // 3) Use headers hints for first/last if present
      const lowerHeaders = inferredColumns.map((h) => String(h).toLowerCase());
      const headerFirstIdx = !firstRowHasEmail ? lowerHeaders.findIndex((h) => /(^|\b)first(\b|name)/.test(h)) : -1;
      const headerLastIdx = !firstRowHasEmail ? lowerHeaders.findIndex((h) => /(^|\b)last(\b|name)/.test(h)) : -1;

      // Initialize roles
      const roles: ColumnRole[] = new Array(maxCols).fill('other');
      roles[bestEmailIdx] = 'email';

      if (likelyFull.length > 0) {
        roles[likelyFull[0].c] = 'full';
      } else if (headerFirstIdx >= 0 && headerLastIdx >= 0 && headerFirstIdx !== headerLastIdx) {
        roles[headerFirstIdx] = 'first';
        roles[headerLastIdx] = 'last';
      } else {
        // ambiguous: pick a candidate column to ask user whether it's First or Last
        const candidateToAsk = nameCandidates.find((c) => c !== headerFirstIdx && c !== headerLastIdx);
        setCsvColumns(inferredColumns);
        setCsvRows(allRows);
        setDataStartRowIndex(startIndex);
        setEmailColIndex(bestEmailIdx);
        setColumnRoles(roles);
        setPromptColumnIdx(candidateToAsk ?? nameCandidates[0] ?? 0);
        setMappingStep('promptKind');
        setMappingOpen(true);
        return; // wait for user input
      }

      // If we got here, we have either full name or first+last detected. Let user review before import
      setCsvColumns(inferredColumns);
      setCsvRows(allRows);
      setDataStartRowIndex(startIndex);
      setEmailColIndex(bestEmailIdx);
      setColumnRoles(roles);
      setPromptColumnIdx(null);
      setMappingStep('review');
      setMappingOpen(true);
      return;
    } catch {
      showDialogError('Failed to import CSV.');
    } finally {
      setImporting(false);
      // reset input value so the same file can be chosen again
      e.target.value = '';
    }
  }

  async function performImportWithRoles(allRows: string[][], startIndex: number, roles: ColumnRole[]) {
    const emailIdx = roles.findIndex((r) => r === 'email');
    if (emailIdx < 0) throw new Error('Email column not selected.');
    let added = 0;
    let invalidEmailCount = 0;
    let missingLastCount = 0;
    let missingFirstCount = 0;
    const addedEmails: string[] = [];
    for (let i = startIndex; i < allRows.length; i += 1) {
      const row = allRows[i] || [];
      const emailVal = String(row[emailIdx] || '').trim().toLowerCase();
      if (!isValidEmail(emailVal)) { invalidEmailCount += 1; continue; }
      const fullIdx = roles.findIndex((r) => r === 'full');
      const firstIdx = roles.findIndex((r) => r === 'first');
      const lastIdx = roles.findIndex((r) => r === 'last');
      let first = '';
      let last = '';
      if (fullIdx >= 0) {
        const guess = guessNameParts(String(row[fullIdx] || ''));
        first = guess.firstName; last = guess.lastName;
        if (!last) { missingLastCount += 1; continue; }
      } else {
        if (firstIdx >= 0) first = String(row[firstIdx] || '').trim();
        if (lastIdx >= 0) last = String(row[lastIdx] || '').trim();
        if (!first) { missingFirstCount += 1; continue; }
        if (!last) { missingLastCount += 1; continue; }
      }
      try {
        const userId = await createUser({ 
          email: emailVal, 
          firstName: first || 'Student', 
          lastName: last || '',
          role: 'STUDENT',
          ...demoArgs,
        });
        await createEnrollment({ 
          sectionId: params.id as Id<'sections'>, 
          studentId: userId,
          ...demoArgs,
        });
        added += 1;
        addedEmails.push(emailVal);
      } catch {
        // continue
      }
    }
    const parts: string[] = [];
    if (invalidEmailCount > 0) parts.push(`${invalidEmailCount} ${invalidEmailCount === 1 ? 'invalid email' : 'invalid emails'}`);
    const totalMissing = missingLastCount + missingFirstCount;
    if (totalMissing > 0) {
      if (missingLastCount > 0 && missingFirstCount === 0) parts.push(`${missingLastCount} ${missingLastCount === 1 ? 'missing last name' : 'missing last names'}`);
      else if (missingFirstCount > 0 && missingLastCount === 0) parts.push(`${missingFirstCount} ${missingFirstCount === 1 ? 'missing first name' : 'missing first names'}`);
      else parts.push(`${totalMissing} ${totalMissing === 1 ? 'missing name' : 'missing names'}`);
    }
    const rejectMsg = parts.length ? ` ${invalidEmailCount + totalMissing} ${invalidEmailCount + totalMissing === 1 ? 'student was' : 'students were'} not imported because ${parts.join(' and ')}.` : '';
    setImportMessage(`Imported ${added} ${added === 1 ? 'student' : 'students'}.${rejectMsg}`);
    setLastAction({ type: 'import', snapshot: [...students], label: `Imported ${added} ${added === 1 ? 'student' : 'students'}.` });
    setToastMessage(`Imported ${added} ${added === 1 ? 'student' : 'students'}.`);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
  }

  if (teacherReady && sectionAccess?.status === "not_found") {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Card className="p-6 max-w-lg w-full text-center space-y-4">
          <div className="text-xl font-semibold">The requested course could not be found</div>
          <div className="text-slate-600 dark:text-slate-300 text-sm">Check the URL and try again.</div>
          <div className="flex justify-center">
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (teacherReady && sectionAccess?.status === "forbidden") {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Card className="p-6 max-w-lg w-full text-center space-y-4">
          <div className="text-xl font-semibold">You do not have permission to view this course</div>
          <div className="text-slate-600 dark:text-slate-300 text-sm">Use an authorized account or return to your dashboard.</div>
          <div className="flex justify-center">
            <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader loaded={sectionLoaded} title={sectionTitle} gradient={sectionGradient} />

      <Card className="p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <div className="font-medium text-lg">Roster</div>
            <div className="text-sm text-slate-500">{students.length} student{students.length === 1 ? '' : 's'}</div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImportCsv} disabled={importing || importWorking} />
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={importing || importWorking} className="inline-flex items-center gap-2">
              <HiOutlineArrowUpTray className="h-5 w-5" /> {importWorking ? 'Importing…' : 'Import CSV'}
            </Button>
            {students.length > 0 && (
              <Button variant="ghost" onClick={() => setConfirmClearOpen(true)} disabled={confirmWorking} className="inline-flex items-center gap-2">
                <HiOutlineTrash className="h-5 w-5" /> Remove All Students
              </Button>
            )}
          </div>
        </div>
        {importMessage && (
          <div className="flex items-center justify-between text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 mb-3">
            <span>{importMessage}</span>
            <button className="text-green-700/70 hover:text-green-800 px-2" onClick={() => setImportMessage(null)}>×</button>
          </div>
        )}
        <div className="space-y-3">
          {(!section || !enrollments || !allStudents) ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 border rounded-lg bg-white/50 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="sm:ml-auto w-full sm:w-auto grid grid-cols-2 gap-2">
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                  </div>
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-slate-300 p-3 border rounded-lg bg-white/50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">No students yet. Add one below.</div>
          ) : students.map((s) => (
            <RosterRow
              key={String(s.id)}
              student={{ id: String(s.id), email: s.email, firstName: s.firstName, lastName: s.lastName }}
              isEditing={editId === s.id}
              editEmail={editEmail}
              editFirstName={editFirstName}
              editLastName={editLastName}
              onChangeEmail={setEditEmail}
              onChangeFirst={setEditFirstName}
              onChangeLast={setEditLastName}
              onBeginEdit={() => beginEdit(s)}
              onCancelEdit={cancelEdit}
              onSaveEdit={(id) => saveEdit(id)}
              deleting={deletingIds.has(s.id)}
              onRemove={async () => {
                setDeletingIds((prev) => new Set(prev).add(s.id));
                try {
                  const snapshot = [...students];
                  await removeEnrollment({ sectionId: params.id as Id<'sections'>, studentId: s.id, ...demoArgs });
                  setLastAction({ type: 'remove_one', snapshot, label: `Removed ${s.firstName} ${s.lastName}.` });
                  setToastMessage(`Removed ${s.firstName} ${s.lastName}.`);
                  setToastVisible(true);
                  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
                } catch {
                  showDialogError('Failed to remove student');
                } finally {
                  setDeletingIds((prev) => { const n = new Set(prev); n.delete(s.id); return n; });
                }
              }}
            />
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
        <ImportCsvModal
          open={mappingOpen}
          onClose={() => { setMappingOpen(false); setImporting(false); }}
          mappingStep={mappingStep}
          promptColumnIdx={promptColumnIdx}
          csvColumns={csvColumns}
          csvRows={csvRows}
          dataStartRowIndex={dataStartRowIndex}
          columnRoles={columnRoles}
          setColumnRoles={setColumnRoles}
          emailColIndex={emailColIndex}
          reviewError={reviewError}
          setReviewError={setReviewError}
          isFullNameColumnValid={isFullNameColumnValid}
          openDropdownIdx={openDropdownIdx}
          setOpenDropdownIdx={setOpenDropdownIdx}
          dropdownBackdropKey={dropdownBackdropKey}
          setDropdownBackdropKey={(n: number) => setDropdownBackdropKey(n)}
          importWorking={importWorking}
          validateRolesForImport={validateRolesForImport}
          onImportClick={async () => {
            const v = validateRolesForImport(columnRoles);
            if (!v.ok) { setReviewError(v.message || 'Please finish mapping before importing.'); return; }
            try {
              setImportWorking(true);
              await performImportWithRoles(csvRows, dataStartRowIndex, columnRoles);
            } finally {
              setImportWorking(false);
            }
            setMappingOpen(false);
            setImporting(false);
          }}
          setPromptColumnIdx={setPromptColumnIdx}
          setMappingStep={setMappingStep}
        />
      )}
      <Modal open={confirmClearOpen} onClose={() => { if (!confirmWorking) setConfirmClearOpen(false); }}>
          <div className="w-[min(92vw,520px)] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg shadow-xl p-4 sm:p-6 transition-all duration-200 ease-out">
            <div className="text-lg font-semibold mb-1">Remove all students?</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">This action cannot be undone.</div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmClearOpen(false)} disabled={confirmWorking}>Cancel</Button>
              <Button className="!text-white !bg-rose-600 hover:!bg-rose-500 inline-flex items-center gap-2" onClick={async () => {
                try {
                  setConfirmWorking(true);
                  const snapshot = [...students];
                  await runWithConcurrency(snapshot, 10, async (s) => {
                    await removeEnrollment({ sectionId: params.id as Id<'sections'>, studentId: s.id, ...demoArgs });
                  });
                  setLastAction({ type: 'remove_all', snapshot, label: 'All students removed.' });
                  setToastMessage('All students removed.');
                  setToastVisible(true);
                  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
                  setConfirmClearOpen(false);
                } catch {
                  showDialogError('Failed to remove all students');
                } finally {
                  setConfirmWorking(false);
                }
              }} disabled={confirmWorking}><HiOutlineTrash className="h-5 w-5" /> {confirmWorking ? 'Removing…' : 'Remove all'}</Button>
            </div>
          </div>
        </Modal>
      {toastVisible && (
        <div className="fixed bottom-4 left-4 z-[60]">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-xl shadow-soft px-4 py-3 flex items-center gap-3">
            <span className="text-sm">{toastMessage}</span>
            <Button
              variant="primary"
              disabled={undoWorking}
              onClick={async () => {
                if (!lastAction) return;
                setUndoWorking(true);
                if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
                const snapshot = lastAction.snapshot;
                try {
                  const currentIds = new Set(students.map((s) => s.id));
                  const snapshotIds = new Set(snapshot.map((s) => s.id));
                  const toDelete = students.filter((s) => !snapshotIds.has(s.id));
                  const toAdd = snapshot.filter((s) => !currentIds.has(s.id));
                  await Promise.all([
                    runWithConcurrency(toDelete, 10, async (s) => {
                      await removeEnrollment({ sectionId: params.id as Id<'sections'>, studentId: s.id, ...demoArgs });
                    }),
                    runWithConcurrency(toAdd, 8, async (s) => {
                      const userId = await createUser({ email: s.email, firstName: s.firstName, lastName: s.lastName, role: "STUDENT", ...demoArgs });
                      await createEnrollment({ sectionId: params.id as Id<'sections'>, studentId: userId, ...demoArgs });
                    })
                  ]);
                  setToastVisible(false);
                } catch {
                  showDialogError('Failed to undo.');
                } finally {
                  setUndoWorking(false);
                }
              }}
            >
              {undoWorking ? 'Undoing…' : 'Undo'}
            </Button>
          </div>
        </div>
      )}
      <Modal open={!!dialogError} onClose={() => setDialogError(null)}>
        <div className="w-[min(92vw,520px)] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg shadow-xl p-4 sm:p-6">
          <div className="text-lg font-semibold mb-2">Unable to complete action</div>
          <div className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{dialogError}</div>
          <div className="flex justify-end">
            <Button onClick={() => setDialogError(null)}>OK</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
