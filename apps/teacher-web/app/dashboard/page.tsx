"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Button, Card, TextInput, Modal, Skeleton } from '@snaproll/ui';
import { HiOutlineCog6Tooth, HiOutlineUserGroup, HiOutlineDocumentChartBar, HiOutlinePlus, HiOutlineSparkles, HiChevronDown, HiOutlineCloud, HiOutlineTrash, HiOutlineChartBar, HiOutlinePlayCircle } from 'react-icons/hi2';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery, useMutation } from 'convex/react';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';

type SectionDoc = Doc<'sections'>;

function hasId(record: unknown): record is { _id: string } {
  if (typeof record !== 'object' || record === null) return false;
  const obj = record as Record<string, unknown>;
  return typeof obj._id === 'string';
}

function extractId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (hasId(value)) return value._id;
  return '';
}
type CurrentUser = { _id: string } | null | undefined;

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [customizeModal, setCustomizeModal] = useState<{ open: boolean; section: SectionDoc | null }>({ open: false, section: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [openMenuFor, setOpenMenuFor] = useState<Id<'sections'> | null>(null);
  const [wcOpen, setWcOpen] = useState(false);
  const [wcSectionId, setWcSectionId] = useState<Id<'sections'> | null>(null);
  const [wcPrompt, setWcPrompt] = useState('One word to describe how you feel');
  const [wcShowPrompt, setWcShowPrompt] = useState(true);
  const [wcAllowMultiple, setWcAllowMultiple] = useState(false);
  const [wcWorking, setWcWorking] = useState(false);
  const [wcError, setWcError] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollSectionId, setPollSectionId] = useState<Id<'sections'> | null>(null);
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideSectionId, setSlideSectionId] = useState<Id<'sections'> | null>(null);
  const [slideSelectedAssetId, setSlideSelectedAssetId] = useState<Id<'slideshowAssets'> | null>(null);
  const [slideSelectedSessionId, setSlideSelectedSessionId] = useState<Id<'slideshowSessions'> | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideShowOnDevices, setSlideShowOnDevices] = useState(true);
  const [slideAllowDownload, setSlideAllowDownload] = useState(true);
  const [slideRequireStay, setSlideRequireStay] = useState(false);
  const [slidePreventJump, setSlidePreventJump] = useState(false);
  const [slideUploadFile, setSlideUploadFile] = useState<File | null>(null);
  const [slideWorking, setSlideWorking] = useState(false);
  const [slideError, setSlideError] = useState<string | null>(null);

  // Convex mutations
  const createSection = useMutation(api.functions.sections.create);
  const updateSection = useMutation(api.functions.sections.update);
  const deleteSection = useMutation(api.functions.sections.deleteSection);
  const startWordCloud = useMutation(api.functions.wordcloud.startWordCloud);
  const startSlideshow = useMutation(api.functions.slideshow.startSlideshow);

  // Current user via Clerk/Convex
  const currentUser: CurrentUser = useQuery(convexApi.auth.getCurrentUser);
  const teacherId: Id<'users'> | null = hasId(currentUser) ? (currentUser._id as Id<'users'>) : null;
  const upsertUser = useMutation(api.functions.auth.upsertCurrentUser);
  const { isLoaded, isSignedIn } = useAuth();

  // Data queries
  const getAssetsByTeacher = useQuery(api.functions.slideshow.getAssetsByTeacher, teacherId ? { teacherId } : "skip");
  const sectionsResult = useQuery(api.functions.sections.getByTeacher, teacherId ? { teacherId } : "skip") as SectionDoc[] | undefined;
  const isSectionsLoading = !!teacherId && sectionsResult === undefined;
  const sections = (sectionsResult ?? []) as SectionDoc[];

  const gradients = [
    { id: 'gradient-1', name: 'Purple Blue', class: 'gradient-1' },
    { id: 'gradient-2', name: 'Pink Red', class: 'gradient-2' },
    { id: 'gradient-3', name: 'Blue Cyan', class: 'gradient-3' },
    { id: 'gradient-4', name: 'Green Teal', class: 'gradient-4' },
    { id: 'gradient-5', name: 'Pink Yellow', class: 'gradient-5' },
    { id: 'gradient-6', name: 'Teal Pink', class: 'gradient-6' },
    { id: 'gradient-7', name: 'Peach', class: 'gradient-7' },
    { id: 'gradient-8', name: 'Sky Blue', class: 'gradient-8' },
    { id: 'gradient-9', name: 'Sunset', class: 'gradient-9' },
  ];

  useEffect(() => { setMounted(true); }, []);

  // Fallback: if signed in but no Convex user yet, upsert as TEACHER
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (currentUser === undefined) return; // still loading
    if (!currentUser) {
      upsertUser({ role: 'TEACHER' }).catch(() => {});
    }
  }, [isLoaded, isSignedIn, currentUser, upsertUser]);

  async function handleStartWordCloud() {
    if (!wcSectionId) return;
    if (!wcPrompt.trim()) {
      alert('Please enter a prompt.');
      return;
    }
    try {
      setWcWorking(true);
      setWcError(null);
      const sessionId = await startWordCloud({ sectionId: wcSectionId as Id<'sections'>, prompt: wcPrompt, showPromptToStudents: wcShowPrompt, allowMultipleAnswers: wcAllowMultiple });
      setWcOpen(false);
      setTimeout(() => router.push(`/wordcloud/live/${extractId(sessionId)}`), 120);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to start word cloud. Please try again.';
      setWcError(message);
    } finally {
      setWcWorking(false);
    }
  }

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

  async function saveCustomization(title: string, gradient: string) {
    if (!customizeModal.section || !title.trim()) return;
    const sid = customizeModal.section._id as Id<'sections'>;
    await updateSection({ id: sid, title: title.trim(), gradient });
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
          <div className="text-slate-500">Create your first section to begin.</div>
          <Button variant="primary" className="mt-4 inline-flex items-center gap-2" onClick={async () => {
            const title = prompt('Section title?');
            if (!title || !teacherId) return;
            await createSection({ title });
          }}><HiOutlinePlus className="h-5 w-5" /> Create New Section</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-hidden">
          {sections.map((s: SectionDoc) => {
            const gradientClass = s.gradient;
            
            return (
                <Card key={s._id} className="p-3 sm:p-4 flex flex-col overflow-visible group">
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
                  <div className="font-medium mb-2 text-slate-700 truncate">{s.title}</div>
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
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuFor(null)} aria-hidden>
                            {/* anchored menu */}
                            <div
                              className="absolute z-50 max-h-[60vh] overflow-auto min-w-[12rem] bg-white border rounded-xl shadow-soft p-1"
                              role="menu"
                              aria-label="Activities"
                              ref={(el) => {
                                if (!el) return;
                                const btn = document.querySelector(`[data-activities-trigger="${s._id}"]`) as HTMLElement | null;
                                const rect = btn?.getBoundingClientRect();
                                const vw = window.innerWidth;
                                const vh = window.innerHeight;
                                if (rect) {
                                  const spaceBelow = vh - rect.bottom;
                                  // Match width to the button (same as Take Attendance, since they share flex widths)
                                  el.style.width = `${rect.width}px`;
                                  // Place below unless not enough space
                                  const provisionalTop = spaceBelow < 220 ? rect.top - el.offsetHeight - 8 : rect.bottom + 8;
                                  const top = Math.max(8, Math.min(vh - el.offsetHeight - 8, provisionalTop));
                                  const left = Math.min(vw - rect.width - 8, Math.max(8, rect.left));
                                  el.style.top = `${top}px`;
                                  el.style.left = `${left}px`;
                                } else {
                                  el.style.bottom = '96px';
                                  el.style.left = '16px';
                                }
                              }}
                            >
                              <button
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 inline-flex items-center gap-2"
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
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 inline-flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuFor(null);
                                  // open poll modal for this section
                                  setPollSectionId(s._id);
                                  setPollOpen(true);
                                }}
                                role="menuitem"
                              >
                                <HiOutlineChartBar className="h-5 w-5" /> Poll
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 inline-flex items-center gap-2"
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
        </>
      )}
      
      <Button variant="primary" className="fixed right-6 rounded-full px-5 py-3 shadow-soft z-50 inline-flex items-center gap-2" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }} onClick={() => setCreateModalOpen(true)}><HiOutlinePlus className="h-5 w-5" /> Create New Section</Button>

      <Modal open={!!customizeModal.open && !!customizeModal.section} onClose={handleCloseCustomize}>
        {customizeModal.section && (
          <div className="bg-white rounded-lg p-6 max-w-md w-[90vw] mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Edit Section</h2>
              <button onClick={handleCloseCustomize} className="text-slate-400 hover:text-slate-600">✕</button>
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
        <div className="bg-white rounded-lg p-6 max-w-md w-[90vw] mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Create Section</h2>
            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Section Title</label>
              <TextInput value={createTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateTitle(e.target.value)} placeholder="Enter section title" onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && createTitle.trim()) { e.preventDefault(); (document.getElementById('create-section-submit') as HTMLButtonElement | null)?.click(); } }} />
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button id="create-section-submit" onClick={async () => { if (!teacherId || !createTitle.trim()) return; await createSection({ title: createTitle.trim() }); setCreateModalOpen(false); setCreateTitle(''); }}>Create</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Start Word Cloud Modal (inline on dashboard) */}
      <Modal open={wcOpen} onClose={() => setWcOpen(false)}>
        <div className="bg-white rounded-lg p-6 w-[90vw] max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2 text-lg font-semibold"><HiOutlineCloud className="h-6 w-6" /> Start Word Cloud</div>
            <button onClick={() => setWcOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prompt</label>
              <TextInput value={wcPrompt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWcPrompt(e.target.value)} placeholder="Enter prompt" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={wcShowPrompt} onChange={(e) => setWcShowPrompt(e.target.checked)} />
              <span>Show prompt on student devices</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={wcAllowMultiple} onChange={(e) => setWcAllowMultiple(e.target.checked)} />
              <span>Allow multiple answers</span>
            </label>
            {wcError && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{wcError}</div>
            )}
            <div className="pt-2">
              <Button onClick={handleStartWordCloud} className="w-full inline-flex items-center justify-center gap-2" disabled={wcWorking}>
                {wcWorking ? 'Starting…' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Start Poll Modal */}
      <PollStartModal open={pollOpen} onClose={() => setPollOpen(false)} sectionId={pollSectionId} />

      {/* Present Slideshow Modal */}
      <Modal open={slideOpen && !!slideSectionId} onClose={() => setSlideOpen(false)}>
        <div className="bg-white rounded-xl p-8 w-[95vw] max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HiOutlinePlayCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Present Slideshow</h2>
                <p className="text-sm text-slate-600">Broadcast your slideshow to student devices in real-time</p>
              </div>
            </div>
            <button 
              onClick={() => setSlideOpen(false)} 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recents Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Recents</h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">72h retention</span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {!getAssetsByTeacher || getAssetsByTeacher.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    No recent slideshows
                  </div>
                ) : (
                  (getAssetsByTeacher as Array<{ _id: Id<'slideshowAssets'>; title: string; createdAt: number }>).map((asset) => (
                    <div key={asset._id} className="group relative">
                      <button 
                        onClick={() => { 
                          setSlideSelectedAssetId(asset._id); 
                          setSlideSelectedSessionId(null); 
                          setSlideUploadFile(null);
                          setSlideTitle(asset.title);
                        }} 
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          slideSelectedAssetId === asset._id 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-12 bg-slate-100 rounded-lg border border-slate-200 flex-shrink-0 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 truncate">{asset.title}</div>
                            <div className="text-xs text-slate-400 mt-1">
                              {new Date(asset.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            // Note: Asset deletion would need to be implemented in Convex
                            console.log('Delete asset:', asset._id);
                          } catch (e) {
                            console.error('Failed to delete asset:', e);
                          }
                        }}
                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete slideshow"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upload Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload New File</h3>
              
              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select File (PDF only)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf"
                    onChange={(e) => { 
                      const f = e.target.files?.[0] || null; 
                      setSlideUploadFile(f); 
                      setSlideSelectedAssetId(null); 
                      setSlideSelectedSessionId(null);
                      if (f) setSlideTitle(f.name.replace(/\.pdf$/i, '')); 
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="mx-auto w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> or drag and drop
                    </div>
                    <div className="text-xs text-slate-500 mt-1">PDF files only</div>
                  </label>
                </div>
                {slideUploadFile && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">{slideUploadFile.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Slideshow Title</label>
                <TextInput 
                  value={slideTitle} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlideTitle(e.target.value)} 
                  placeholder="Enter a title for your slideshow" 
                  className="w-full"
                />
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-700">Presentation Settings</h4>
                
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={slideShowOnDevices} 
                    onChange={(e) => setSlideShowOnDevices(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Show on Student Devices</div>
                    <div className="text-sm text-slate-600">Students can view the slideshow on their devices</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={slideAllowDownload} 
                    onChange={(e) => setSlideAllowDownload(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Allow Students to Download</div>
                    <div className="text-sm text-slate-600">Students can download the slideshow files</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={slideRequireStay} 
                    onChange={(e) => { 
                      const v = e.target.checked; 
                      setSlideRequireStay(v); 
                      if (v) setSlidePreventJump(false); 
                    }}
                    className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Require Students to Stay on Current Slide</div>
                    <div className="text-sm text-slate-600">Students cannot navigate away from the current slide</div>
                  </div>
                </label>

                {!slideRequireStay && (
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={slidePreventJump} 
                      onChange={(e) => setSlidePreventJump(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Prevent Students from Jumping Ahead</div>
                      <div className="text-sm text-slate-600">Students cannot navigate to future slides</div>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {slideError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-800">{slideError}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setSlideOpen(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              disabled={slideWorking || !slideSectionId || (!slideSelectedAssetId && !slideSelectedSessionId && !slideUploadFile)} 
              onClick={async () => {
                if (!slideSectionId) return;
                setSlideWorking(true);
                setSlideError(null);
                try {
                  if (slideSelectedAssetId) {
                    const sessionId = await startSlideshow({ sectionId: slideSectionId as Id<'sections'>, assetId: slideSelectedAssetId as Id<'slideshowAssets'>, 
                      showOnDevices: slideShowOnDevices,
                      allowDownload: slideAllowDownload,
                      requireStay: slideRequireStay,
                      preventJump: slidePreventJump,
                    });
                    setSlideOpen(false);
                    setTimeout(() => router.push(`/slideshow/live/${extractId(sessionId)}`), 120);
                  } else if (slideUploadFile) {
                    const fd = new FormData();
                    fd.append('file', slideUploadFile);
                    if (slideTitle) fd.append('title', slideTitle);
                    const res = await fetch('/api/slideshow/assets', { method: 'POST', body: fd, credentials: 'include' });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      throw new Error(j.error || 'Failed to upload file');
                    }
                    const j = await res.json();
                    const newAssetId: string | undefined = j.assetId || j.id || j._id;
                    if (!newAssetId) throw new Error('Upload succeeded but no assetId returned');
                    const sessionId = await startSlideshow({ sectionId: slideSectionId as Id<'sections'>, assetId: newAssetId as Id<'slideshowAssets'>, 
                      showOnDevices: slideShowOnDevices,
                      allowDownload: slideAllowDownload,
                      requireStay: slideRequireStay,
                      preventJump: slidePreventJump,
                    });
                    setSlideOpen(false);
                    setTimeout(() => router.push(`/slideshow/live/${extractId(sessionId)}`), 120);
                  } else {
                    setSlideError('Please select an asset to present');
                  }
                } catch (e: unknown) {
                  setSlideError(e instanceof Error ? e.message : 'Failed to start slideshow');
                } finally {
                  setSlideWorking(false);
                }
              }}
              className="px-8"
            >
              {slideWorking ? 'Starting...' : 'Start Slideshow'}
            </Button>
          </div>
        </div>
      </Modal>
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
  onSave: (title: string, gradient: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState<string>(section.title ?? "");
  const [gradient, setGradient] = useState<string>(section.gradient ?? "gradient-1");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Section Title</label>
        <TextInput 
          value={title} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && title.trim()) { e.preventDefault(); onSave(title, gradient); } }}
          placeholder="Enter section title"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Choose Gradient</label>
        <div className="grid grid-cols-3 gap-2">
          {gradients.map((g) => (
            <button
              key={g.id}
              onClick={() => setGradient(g.id)}
              className={`aspect-[3/2] rounded-lg ${g.class} relative overflow-hidden border-2 transition-all ${
                gradient === g.id ? 'border-white shadow-lg scale-105' : 'border-transparent hover:scale-102'
              }`}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="font-futuristic font-bold text-white text-xs text-center px-1">
                  {g.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-2 pt-4 justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(title, gradient)} disabled={!title.trim()}>
          Save Changes
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="mt-6 border border-rose-200 rounded-lg">
        <div className="px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 rounded-t-lg">Danger Zone</div>
        <div className="p-3">
          <div className="text-sm text-slate-600 mb-2">Deleting a section will remove its roster, attendance, and activities.</div>
          {!confirmDelete ? (
            <div className="flex justify-end">
              <Button variant="ghost" className="inline-flex items-center gap-2 text-rose-700 hover:text-white hover:!bg-rose-600" onClick={() => setConfirmDelete(true)}>
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

function PollStartModal({ open, onClose, sectionId }: { open: boolean; onClose: () => void; sectionId: Id<'sections'> | null }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [working, setWorking] = useState(false);
  const startPollMutation = useMutation(api.functions.polls.startPoll);
  function setOptionAt(i: number, val: string) {
    setOptions((prev: string[]) => prev.map((v, idx) => (idx === i ? val : v)));
  }
  function addOption() {
    setOptions((prev: string[]) => [...prev, '']);
  }
  const visible = open && !!sectionId;
  return (
    <Modal open={visible} onClose={onClose}>
      <div className="bg-white rounded-lg p-6 w-[90vw] max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Start Poll</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Prompt</label>
            <TextInput value={prompt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)} placeholder="Type your prompt here..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <TextInput key={i} value={opt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptionAt(i, e.target.value)} placeholder={`Option ${i + 1}`} />
              ))}
              <TextInput
                value={''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (val.length === 0) return;
                  addOption();
                  // set the newly created last option value
                  setOptions((prev: string[]) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = val;
                    return copy;
                  });
                }}
                placeholder="Add another option..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={working || !sectionId || !prompt.trim() || options.filter((o) => o.trim()).length < 2} onClick={async () => {
              if (!sectionId) return;
              try {
                setWorking(true);
                const opts = options.map((o) => o.trim()).filter(Boolean);
                const sessionId = await startPollMutation({ sectionId: sectionId as Id<'sections'>, prompt: prompt.trim(), options: opts });
                onClose();
                setTimeout(() => router.push(`/poll/live/${extractId(sessionId)}`), 120);
              } finally {
                setWorking(false);
              }
            }}>{working ? 'Starting…' : 'Start'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
