"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, TextInput, Modal, Skeleton } from '@flamelink/ui';
import dynamic from 'next/dynamic';
import { HiOutlineCog6Tooth, HiOutlineUserGroup, HiOutlineDocumentChartBar, HiOutlinePlus, HiOutlineSparkles, HiChevronDown, HiOutlineCloud, HiOutlineTrash, HiOutlineChartBar, HiOutlinePlayCircle } from 'react-icons/hi2';
import { api } from '@flamelink/convex-client';
import { useQuery, useMutation } from 'convex/react';
import type { Id } from '@flamelink/convex-client';
import type { Doc } from '../../../../convex/_generated/dataModel';

type SectionDoc = Doc<'sections'>;

function hasId(record: unknown): record is { _id: string } {
  if (typeof record !== 'object' || record === null) return false;
  const obj = record as Record<string, unknown>;
  return typeof obj._id === 'string';
}

// extractId no longer used after moving to dynamic modals
type CurrentUser = { _id: string } | null | undefined;

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [customizeModal, setCustomizeModal] = useState<{ open: boolean; section: SectionDoc | null }>({ open: false, section: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createAbsences, setCreateAbsences] = useState<{ mode: 'not_set' | 'policy' | 'custom'; timesPerWeek: 1 | 2 | 3; duration: 'semester' | '8week'; custom?: string }>({ mode: 'not_set', timesPerWeek: 3, duration: 'semester', custom: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createAttendancePoints, setCreateAttendancePoints] = useState<string>('');
  const [createParticipationPossible, setCreateParticipationPossible] = useState<string>('');
  const [createAbsencesEnabled, setCreateAbsencesEnabled] = useState<boolean>(false);
  const [createParticipationEnabled, setCreateParticipationEnabled] = useState<boolean>(false);
  const [openMenuFor, setOpenMenuFor] = useState<Id<'sections'> | null>(null);
  const [wcOpen, setWcOpen] = useState(false);
  const [wcSectionId, setWcSectionId] = useState<Id<'sections'> | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollSectionId, setPollSectionId] = useState<Id<'sections'> | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideSectionId, setSlideSectionId] = useState<Id<'sections'> | null>(null);

  // Convex mutations
  const createSection = useMutation(api.functions.sections.create);
  const updateSection = useMutation(api.functions.sections.update);
  const deleteSection = useMutation(api.functions.sections.deleteSection);

  // Current user via Clerk/Convex
  const currentUser: CurrentUser = useQuery(api.functions.auth.getCurrentUser);
  const teacherId: Id<'users'> | null = hasId(currentUser) ? (currentUser._id as Id<'users'>) : null;
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const { isLoaded, isSignedIn } = useAuth();

  // Data queries
  const sectionsResult = useQuery(api.functions.sections.getByTeacher, teacherId ? { teacherId } : "skip") as SectionDoc[] | undefined;
  const isSectionsLoading = !!teacherId && sectionsResult === undefined;
  const sections = useMemo(() => (sectionsResult ?? []) as SectionDoc[], [sectionsResult]);
  const backfillJoinCodes = useMutation(api.functions.sections.backfillJoinCodesForTeacher);
  // const devMode = (process.env.NEXT_PUBLIC_DEV_MODE ?? 'false') === 'true';

  const gradients = [
    // First row
    { id: 'gradient-3', name: 'Blue Cyan', class: 'gradient-3' },
    { id: 'gradient-4', name: 'Green Teal', class: 'gradient-4' },
    { id: 'gradient-5', name: 'Pink Yellow', class: 'gradient-5' },
    { id: 'gradient-1', name: 'Purple Blue', class: 'gradient-1' },
    { id: 'gradient-9', name: 'Sunset', class: 'gradient-9' },
    { id: 'gradient-6', name: 'Teal Pink', class: 'gradient-6' },
    { id: 'gradient-2', name: 'Pink Red', class: 'gradient-2' },
    { id: 'gradient-7', name: 'Peach', class: 'gradient-7' },
    { id: 'gradient-8', name: 'Sky Blue', class: 'gradient-8' },
  ];

  function pickAutoGradient(): string {
    const available = gradients.map((g) => g.id);
    const used = new Set((sections || []).map((s) => s.gradient || ''));
    const unused = available.filter((id) => !used.has(id));
    if (unused.length > 0) return unused[0];
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex] || 'gradient-3';
  }

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!sections || sections.length === 0) return;
    const missing = sections.some(s => !(typeof (s as { joinCode?: unknown }).joinCode === 'string' && ((s as { joinCode?: string }).joinCode || '').length > 0));
    if (missing) {
      backfillJoinCodes().catch(() => {});
    }
  }, [sections, backfillJoinCodes]);

  // Fallback: if signed in but no Convex user yet, upsert as TEACHER
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (currentUser === undefined) return; // still loading
    if (!currentUser) {
      upsertUser({ role: 'TEACHER' }).catch(() => {});
    }
  }, [isLoaded, isSignedIn, currentUser, upsertUser]);

  // Word cloud start handled by dynamic modal

  // close any open Interact menu when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const menu = document.querySelector('[data-interact-menu="open"]');
      if (!menu) return;
      if (!menu.contains(target)) setOpenMenuFor(null);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpenMenuFor(null); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  async function saveCustomization(title: string, gradient: string, permittedAbsences?: number | null, attendanceCheckinPoints?: number | null, participationCreditPointsPossible?: number | null) {
    if (!customizeModal.section || !title.trim()) return;
    const sid = customizeModal.section._id as Id<'sections'>;
    await updateSection({
      id: sid,
      title: title.trim(),
      gradient,
      permittedAbsences: permittedAbsences == null ? undefined : permittedAbsences,
      clearPermittedAbsences: permittedAbsences == null,
      attendanceCheckinPoints: attendanceCheckinPoints == null ? undefined : attendanceCheckinPoints,
      participationCreditPointsPossible: participationCreditPointsPossible == null ? undefined : participationCreditPointsPossible,
    });
    handleCloseCustomize();
  }

  function handleCloseCustomize() {
    // First close (triggers modal exit animation), then clear after transition
    setCustomizeModal((prev: { open: boolean; section: SectionDoc | null }) => ({ ...prev, open: false }));
    window.setTimeout(() => {
    setCustomizeModal({ open: false, section: null });
    }, 180);
  }

  if (!mounted) return null;
  if (!teacherId || isSectionsLoading) {
    return (
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-3 sm:p-4 flex flex-col overflow-visible">
              <Skeleton className="aspect-[3/2] rounded-lg mb-3 sm:mb-4" />
              <Skeleton className="h-5 w-2/3 mb-2" />
              <div className="mt-auto space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="h-40" aria-hidden="true" />
      </div>
    );
  }

  const hasSections = sections.length > 0;

  return (
    <div className="relative">
      {!hasSections ? (
        <Card className="p-8 text-center">
          <div className="text-lg font-medium">No sections yet</div>
          <div className="text-slate-500 dark:text-slate-300">Create your first section to begin.</div>
          <Button variant="primary" className="mt-4 inline-flex items-center gap-2" onClick={async () => {
            const title = prompt('Section title?');
            if (!title || !teacherId) return;
            const gradient = pickAutoGradient();
            await createSection({ title, gradient });
          }}><HiOutlinePlus className="h-5 w-5" /> Create New Section</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-hidden">
          {sections.map((s: SectionDoc) => {
            const gradientClass = s.gradient;
            
            return (
                <Card key={s._id} className="p-3 sm:p-4 flex flex-col overflow-visible group bg-white/90 dark:bg-neutral-900/90">
                  <div className={`aspect-[3/2] rounded-lg ${gradientClass} mb-3 sm:mb-4 grid place-items-center text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative z-10 text-center">
                    <div className="font-bold text-lg leading-tight px-2">
                      {s.title}
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 w-3 h-3 bg-white/20 rounded-full"></div>
                  <div className="absolute bottom-2 right-2 w-2 h-2 bg-white/30 rounded-full"></div>
                  
                  {/* Pencil icon that appears on hover */}
                  <button
                    onClick={() => setCustomizeModal({ open: true, section: s })}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30 rounded-full p-1 text-white text-sm"
                      title="Edit Section"
                    >
                      <HiOutlineCog6Tooth className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="font-medium mb-2 text-slate-900 dark:text-slate-100 truncate">{s.title}</div>
                  <div className="mt-auto space-y-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" className="flex-1 inline-flex items-center justify-center gap-2" onClick={() => router.push(`/modify/${s._id}`)}>
                        <HiOutlineUserGroup className="h-5 w-5" /> Roster
                      </Button>
                      <Button variant="ghost" className="flex-1 inline-flex items-center justify-center gap-2" onClick={() => router.push(`/history/${s._id}`)}>
                        <HiOutlineDocumentChartBar className="h-5 w-5" /> View Report
                      </Button>
                    </div>
                    <div className="flex gap-2 items-stretch flex-wrap">
                      {/* Activities dropdown (controlled) */}
                      <div className="relative flex-1" data-interact-menu={openMenuFor === s._id ? 'open' : undefined}>
                        <Button
                          variant="ghost"
                          className="inline-flex items-center gap-2 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuFor((prev: Id<'sections'> | null) => (prev === s._id ? null : s._id));
                          }}
                          aria-haspopup="menu"
                          aria-expanded={openMenuFor === s._id}
                          data-activities-trigger={s._id}
                        >
                          <HiOutlineSparkles className="h-5 w-5" /> Activities
                          <HiChevronDown className={`h-4 w-4 opacity-70 transition-transform ${openMenuFor === s._id ? 'rotate-180' : ''}`} />
                        </Button>
                        {openMenuFor === s._id && (
                          <div className="absolute z-50 mt-2 w-full" role="menu" aria-label="Activities">
                            <div className="max-h-[60vh] overflow-auto bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-soft p-1">
                              <button
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 inline-flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuFor(null);
                                  setWcSectionId(s._id);
                                  setWcOpen(true);
                                }}
                                role="menuitem"
                              >
                                <HiOutlineCloud className="h-5 w-5" /> Word Cloud
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 inline-flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuFor(null);
                                  setPollSectionId(s._id);
                                  setPollOpen(true);
                                }}
                                role="menuitem"
                              >
                                <HiOutlineChartBar className="h-5 w-5" /> Poll
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 inline-flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuFor(null);
                                  setSlideSectionId(s._id);
                                  setSlideOpen(true);
                                }}
                                role="menuitem"
                              >
                                <HiOutlinePlayCircle className="h-5 w-5" /> Present Slideshow
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Attendance button with responsive label */}
                      <Button className="flex-1 truncate" onClick={() => router.push(`/attendance/${s._id}`)}>
                        <span className="hidden sm:inline">Take Attendance</span>
                        <span className="sm:hidden">Attendance</span>
                      </Button>
                    </div>
                </div>
              </Card>
            );
          })}
        </div>
          {/* Spacer so the floating button doesn't overlap the last row on mobile */}
          <div className="h-40" aria-hidden="true" />
          {/* dev-only controls removed */}
        </>
      )}
      
      <Button variant="primary" className="fixed right-6 rounded-full px-5 py-3 shadow-soft z-50 inline-flex items-center gap-2" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }} onClick={() => setCreateModalOpen(true)}><HiOutlinePlus className="h-5 w-5" /> Create New Section</Button>

      <Modal open={!!customizeModal.open && !!customizeModal.section} onClose={handleCloseCustomize}>
        {customizeModal.section && (
          <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg p-6 max-w-xl w-[92vw] mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Edit Section</h2>
              <button onClick={handleCloseCustomize} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" aria-label="Close">✕</button>
            </div>
            <CustomizeModal 
              section={customizeModal.section}
              gradients={gradients}
              onSave={saveCustomization}
              onCancel={handleCloseCustomize}
              onDelete={async (id: string) => {
                await deleteSection({ id: id as Id<'sections'> });
                handleCloseCustomize();
              }}
            />
          </div>
        )}
      </Modal>

      {/* Create Section Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg p-6 max-w-xl w-[92vw] mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">New Section</h2>
            <button onClick={() => setCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">✕</button>
          </div>
          <div className="space-y-6">
            <div>
              <TextInput className="text-lg leading-tight font-bold" value={createTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCreateTitle(e.target.value); if (createError) setCreateError(null); }} placeholder="Enter section title" onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && createTitle.trim()) { e.preventDefault(); (document.getElementById('create-section-submit') as HTMLButtonElement | null)?.click(); } }} />
              {createError && (
                <div className="mt-2 text-sm text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded p-2">{createError}</div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Elective Absences Permitted</span>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Set how many elective absences are permitted.">?</span>
                </div>
                <button onClick={() => setCreateAbsencesEnabled(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${createAbsencesEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'}`} aria-pressed={createAbsencesEnabled} aria-label="Toggle elective absences">
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-200 transition ${createAbsencesEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              {createAbsencesEnabled && (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <button className={`px-3 py-1.5 rounded border transition-colors ${createAbsences.mode === 'policy' ? 'bg-neutral-900 text-neutral-100 border-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'}`} onClick={() => setCreateAbsences((p) => ({ ...p, mode: 'policy' }))}>University Policy</button>
                  <button className={`px-3 py-1.5 rounded border transition-colors ${createAbsences.mode === 'custom' ? 'bg-neutral-900 text-neutral-100 border-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'}`} onClick={() => setCreateAbsences((p) => ({ ...p, mode: 'custom' }))}>Custom</button>
                </div>
                {createAbsences.mode === 'policy' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Meets</span>
                      <select className="border rounded px-2 py-1 text-sm" value={createAbsences.timesPerWeek} onChange={(e) => setCreateAbsences((p) => ({ ...p, timesPerWeek: Number(e.target.value) as 1|2|3 }))}>
                        <option value={1}>1x/week</option>
                        <option value={2}>2x/week</option>
                        <option value={3}>3x/week</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Course length</span>
                      <select className="border rounded px-2 py-1 text-sm" value={createAbsences.duration} onChange={(e) => setCreateAbsences((p) => ({ ...p, duration: e.target.value as 'semester' | '8week' }))}>
                        <option value="semester">Semester-long</option>
                        <option value="8week">8-week</option>
                      </select>
                    </div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-300">
                      {(() => {
                        const t = createAbsences.timesPerWeek;
                        const d = createAbsences.duration;
                        const value = t === 3 ? (d === 'semester' ? 4 : 2) : t === 2 ? (d === 'semester' ? 3 : 1) : 1;
                        return <span>Permitted: <span className="font-medium">{value}</span></span>;
                      })()}
                    </div>
                  </div>
                )}
                {createAbsences.mode === 'custom' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Number</span>
                    <TextInput value={createAbsences.custom || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateAbsences((p) => ({ ...p, custom: e.target.value }))} placeholder="e.g., 3" />
                  </div>
                )}
                <div className="text-xs text-neutral-600 dark:text-neutral-400"><span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Set how many elective absences are permitted. Visible to instructors and students.">?</span></div>
              </div>
              )}
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Participation Credit</span>
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Configure points for attendance and participation.">?</span>
                </div>
                <button onClick={() => setCreateParticipationEnabled(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${createParticipationEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'}`} aria-pressed={createParticipationEnabled} aria-label="Toggle participation credit">
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-200 transition ${createParticipationEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            {createParticipationEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Attendance check-in points</label>
                <TextInput value={createAttendancePoints} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateAttendancePoints(e.target.value.replace(/[^0-9]/g, '').slice(0,5))} placeholder="e.g., 3" />
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"><span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Points each student earns for checking into attendance.">?</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Participation credit points possible</label>
                <TextInput value={createParticipationPossible} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateParticipationPossible(e.target.value.replace(/[^0-9]/g, '').slice(0,5))} placeholder="e.g., 50" />
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"><span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Used to compute gradebook participation.">?</span></div>
              </div>
            </div>
            )}
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button id="create-section-submit" onClick={async () => {
                if (!teacherId) return;
                const t = createTitle.trim();
                if (!t) { setCreateError('Please enter a section title.'); return; }
                if (t.length > 200) { setCreateError('Title must be 1–200 characters.'); return; }
                try {
                  const gradient = pickAutoGradient();
                  const permittedAbsences = !createAbsencesEnabled ? undefined : (createAbsences.mode === 'policy' ? (() => { const tw = createAbsences.timesPerWeek; const d = createAbsences.duration; return tw === 3 ? (d === 'semester' ? 4 : 2) : tw === 2 ? (d === 'semester' ? 3 : 1) : 1; })() : (() => { const n = Number(createAbsences.custom); return Number.isFinite(n) ? Math.max(0, Math.min(60, Math.floor(n))) : undefined; })());
                  const ap = Number(createAttendancePoints);
                  const attendanceCheckinPoints = !createParticipationEnabled ? undefined : (Number.isFinite(ap) ? Math.max(0, Math.min(10000, Math.floor(ap))) : undefined);
                  const pp = Number(createParticipationPossible);
                  const participationCreditPointsPossible = !createParticipationEnabled ? undefined : (Number.isFinite(pp) ? Math.max(0, Math.min(10000, Math.floor(pp))) : undefined);
                  await createSection({ title: t, gradient, permittedAbsences, attendanceCheckinPoints, participationCreditPointsPossible });
                  setCreateModalOpen(false);
                  setCreateTitle('');
                  setCreateError(null);
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Failed to create section.';
                  setCreateError(msg);
                }
              }}>Create</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Start Word Cloud Modal (code-split) */}
      {(() => {
        const LazyWordCloudStartModal = dynamic(() => import('./_components/WordCloudStartModal'), { ssr: false });
        return <LazyWordCloudStartModal open={wcOpen} onClose={() => setWcOpen(false)} sectionId={wcSectionId} />;
      })()}

      {/* Start Poll Modal (code-split) */}
      {(() => {
        const LazyPollStartModal = dynamic(() => import('./_components/PollStartModal'), { ssr: false });
        return <LazyPollStartModal open={pollOpen} onClose={() => setPollOpen(false)} sectionId={pollSectionId} />;
      })()}

      {/* Present Slideshow Modal (code-split) */}
      {(() => {
        const LazySlideshowPresentModal = dynamic(() => import('./_components/SlideshowPresentModal'), { ssr: false });
        return <LazySlideshowPresentModal open={slideOpen && !!slideSectionId} onClose={() => setSlideOpen(false)} sectionId={slideSectionId} />;
      })()}
    </div>
  );
}

function CustomizeModal({ 
  section, 
  gradients, 
  onSave, 
  onCancel,
  onDelete,
}: { 
  section: SectionDoc; 
  gradients: Array<{ id: string; name: string; class: string }>;
  onSave: (
    title: string,
    gradient: string,
    permittedAbsences?: number | null,
    attendanceCheckinPoints?: number | null,
    participationCreditPointsPossible?: number | null
  ) => void;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState<string>(section.title ?? "");
  const [gradient, setGradient] = useState<string>(section.gradient ?? "gradient-1");
  const [permMode, setPermMode] = useState<'policy' | 'custom'>(typeof (section as unknown as { permittedAbsences?: number }).permittedAbsences === 'number' ? 'custom' : 'policy');
  const [absencesEnabled, setAbsencesEnabled] = useState<boolean>(typeof (section as unknown as { permittedAbsences?: number }).permittedAbsences === 'number');
  const [timesPerWeek, setTimesPerWeek] = useState<1|2|3>(3);
  const [duration, setDuration] = useState<'semester' | '8week'>('semester');
  const [customAbsences, setCustomAbsences] = useState<string>(typeof (section as unknown as { permittedAbsences?: number }).permittedAbsences === 'number' ? String((section as unknown as { permittedAbsences?: number }).permittedAbsences) : '');
  const [attendancePoints, setAttendancePoints] = useState<string>(typeof (section as unknown as { attendanceCheckinPoints?: number }).attendanceCheckinPoints === 'number' ? String((section as unknown as { attendanceCheckinPoints?: number }).attendanceCheckinPoints) : '');
  const [participationPossible, setParticipationPossible] = useState<string>(typeof (section as unknown as { participationCreditPointsPossible?: number }).participationCreditPointsPossible === 'number' ? String((section as unknown as { participationCreditPointsPossible?: number }).participationCreditPointsPossible) : '');
  const [participationEnabled, setParticipationEnabled] = useState<boolean>(typeof (section as unknown as { attendanceCheckinPoints?: number }).attendanceCheckinPoints === 'number' || typeof (section as unknown as { participationCreditPointsPossible?: number }).participationCreditPointsPossible === 'number');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <TextInput 
          className="text-lg leading-tight font-bold"
          value={title} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && title.trim()) { e.preventDefault(); onSave(title, gradient); } }}
          placeholder="Enter section title"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Color</label>
        <div className="grid grid-cols-3 gap-2">
          {gradients.map((g) => (
            <button
              key={g.id}
              onClick={() => setGradient(g.id)}
              aria-pressed={gradient === g.id}
              className={`h-10 w-full rounded-md ${g.class} border-2 flex items-center justify-center transition ${
                gradient === g.id ? 'ring-2 ring-neutral-200 dark:ring-neutral-700 border-neutral-200 dark:border-neutral-700' : 'border-transparent hover:opacity-90'
              }`}
              title={g.name}
            >
              <span className="font-semibold text-white/90 dark:text-white/90 text-xs drop-shadow-sm px-2 py-1 rounded-md bg-black/20">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Elective Absences Permitted</span>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Set how many elective absences are permitted.">?</span>
          </div>
          <button onClick={() => setAbsencesEnabled(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${absencesEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'}`} aria-pressed={absencesEnabled} aria-label="Toggle elective absences">
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-200 transition ${absencesEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
        {absencesEnabled && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button className={`px-3 py-1.5 rounded border transition-colors ${permMode === 'policy' ? 'bg-neutral-900 text-neutral-100 border-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'}`} onClick={() => setPermMode('policy')}>University Policy</button>
            <button className={`px-3 py-1.5 rounded border transition-colors ${permMode === 'custom' ? 'bg-neutral-900 text-neutral-100 border-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'}`} onClick={() => setPermMode('custom')}>Custom</button>
          </div>
          {permMode === 'policy' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Meets</span>
                <select className="border rounded px-2 py-1 text-sm" value={timesPerWeek} onChange={(e) => setTimesPerWeek(Number(e.target.value) as 1|2|3)}>
                  <option value={1}>1x/week</option>
                  <option value={2}>2x/week</option>
                  <option value={3}>3x/week</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Course length</span>
                <select className="border rounded px-2 py-1 text-sm" value={duration} onChange={(e) => setDuration(e.target.value as 'semester' | '8week')}>
                  <option value="semester">Semester-long</option>
                  <option value="8week">8-week</option>
                </select>
              </div>
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {(() => {
                  const t = timesPerWeek;
                  const d = duration;
                  const value = t === 3 ? (d === 'semester' ? 4 : 2) : t === 2 ? (d === 'semester' ? 3 : 1) : 1;
                  return <span>Permitted: <span className="font-medium">{value}</span></span>;
                })()}
              </div>
            </div>
          )}
          {permMode === 'custom' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">Number</span>
              <TextInput value={customAbsences} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomAbsences(e.target.value)} placeholder="e.g., 3" />
            </div>
          )}
          <div className="text-xs text-neutral-600 dark:text-neutral-400"><span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Set how many elective absences are permitted. Visible to instructors and students.">?</span></div>
        </div>
        )}
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Participation Credit</span>
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Configure points for attendance and participation.">?</span>
          </div>
          <button onClick={() => setParticipationEnabled(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${participationEnabled ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'}`} aria-pressed={participationEnabled} aria-label="Toggle participation credit">
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-200 transition ${participationEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
      {participationEnabled && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Attendance check-in points</label>
          <TextInput value={attendancePoints} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAttendancePoints(e.target.value.replace(/[^0-9]/g, '').slice(0,5))} placeholder="e.g., 3" />
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"><span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Points each student earns for checking into attendance.">?</span></div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Participation credit points possible</label>
          <TextInput value={participationPossible} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParticipationPossible(e.target.value.replace(/[^0-9]/g, '').slice(0,5))} placeholder="e.g., 50" />
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"><span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300" title="Used to compute gradebook participation.">?</span></div>
        </div>
      </div>
      )}
      </div>
      
      <div className="flex gap-2 pt-4 justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => {
          let permitted: number | null | undefined = undefined;
          if (absencesEnabled) {
            if (permMode === 'policy') {
              permitted = timesPerWeek === 3 ? (duration === 'semester' ? 4 : 2) : (timesPerWeek === 2 ? (duration === 'semester' ? 3 : 1) : 1);
            } else if (permMode === 'custom') {
              const n = Number(customAbsences);
              permitted = Number.isFinite(n) ? Math.max(0, Math.min(60, Math.floor(n))) : undefined;
            }
          } else {
            permitted = null;
          }
          // Compute numeric extras and send in onSave to persist in same mutation
          const ap = Number(attendancePoints);
          const pp = Number(participationPossible);
          const attendanceCheckinPoints = participationEnabled && Number.isFinite(ap) ? Math.max(0, Math.min(10000, Math.floor(ap))) : null;
          const participationCreditPointsPossible = participationEnabled && Number.isFinite(pp) ? Math.max(0, Math.min(10000, Math.floor(pp))) : null;
          onSave(title, gradient, permitted, attendanceCheckinPoints, participationCreditPointsPossible);
        }} disabled={!title.trim()}>
          Save Changes
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 border border-rose-200 dark:border-rose-900/40 rounded-lg">
        <div className="px-3 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 rounded-t-lg">Danger Zone</div>
        <div className="p-3">
          <div className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">Deleting a section will remove its roster, attendance, and activities.</div>
          {!confirmDelete ? (
            <div className="flex justify-end">
              <Button variant="ghost" className="inline-flex items-center gap-2 text-rose-700 dark:text-rose-300 hover:text-white hover:!bg-rose-600" onClick={() => setConfirmDelete(true)}>
                <HiOutlineTrash className="h-5 w-5" /> Delete Section
        </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button variant="ghost" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button className="!bg-rose-600" disabled={deleting} onClick={async () => {
                try {
                  setDeleting(true);
                  const sid = section._id as Id<'sections'>;
                  await onDelete(sid);
                } finally {
                  setDeleting(false);
                }
              }}>{deleting ? 'Removing…' : 'Remove'}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

