"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, TextInput, Modal } from '@snaproll/ui';
import { HiOutlineCog6Tooth, HiOutlineUserGroup, HiOutlineDocumentChartBar, HiOutlinePlus, HiOutlineSparkles, HiChevronDown, HiOutlineCloud, HiOutlineTrash } from 'react-icons/hi2';
import { apiFetch } from '@snaproll/api-client';

type Section = { id: string; title: string; gradient: string };

export default function DashboardPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customizeModal, setCustomizeModal] = useState<{ open: boolean; section: Section | null }>({ open: false, section: null });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [wcOpen, setWcOpen] = useState(false);
  const [wcSectionId, setWcSectionId] = useState<string | null>(null);
  const [wcPrompt, setWcPrompt] = useState('One word to describe how you feel');
  const [wcShowPrompt, setWcShowPrompt] = useState(true);
  const [wcAllowMultiple, setWcAllowMultiple] = useState(false);
  const [wcWorking, setWcWorking] = useState(false);
  const [wcError, setWcError] = useState<string | null>(null);

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

  useEffect(() => {
    setMounted(true);
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
  }, []);

  async function startWordCloud() {
    if (!wcSectionId) return;
    if (!wcPrompt.trim()) {
      alert('Please enter a prompt.');
      return;
    }
    try {
      setWcWorking(true);
      setWcError(null);
      const { session } = await apiFetch<{ session: { id: string } }>(`/api/sections/${wcSectionId}/wordcloud/start`, {
        method: 'POST',
        body: JSON.stringify({ prompt: wcPrompt, showPromptToStudents: wcShowPrompt, allowMultipleAnswers: wcAllowMultiple }),
      });
      setWcOpen(false);
      setTimeout(() => router.push(`/wordcloud/live/${session.id}`), 120);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to start word cloud. Please try again.';
      setWcError(message);
    } finally {
      setWcWorking(false);
    }
  }

  async function load(currentTeacherId: string) {
    try {
      setLoading(true);
      const data = await apiFetch<{ sections: Section[] }>(`/api/sections?teacherId=${currentTeacherId}`);
      setSections(data.sections);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    if (teacherId) {
      setLoading(true);
      load(teacherId);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, teacherId]);

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
    
    await apiFetch(`/api/sections/${customizeModal.section.id}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ title: title.trim(), gradient }) 
    });
    
    // Reload sections to get updated data
    if (teacherId) {
      load(teacherId);
    }
    
    handleCloseCustomize();
  }

  function handleCloseCustomize() {
    // First close (triggers modal exit animation), then clear after transition
    setCustomizeModal((prev) => ({ ...prev, open: false }));
    window.setTimeout(() => {
      setCustomizeModal({ open: false, section: null });
    }, 180);
  }

  if (!mounted) return null;
  if (!teacherId) return <div>Please go back and enter your information.</div>;

  const hasSections = sections.length > 0;

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-6 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="aspect-[3/2] rounded-lg bg-slate-100 mb-4" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {!hasSections ? (
        <Card className="p-8 text-center">
          <div className="text-lg font-medium">No sections yet</div>
          <div className="text-slate-500">Create your first section to begin.</div>
          <Button className="mt-4 inline-flex items-center gap-2" onClick={async () => {
            const title = prompt('Section title?');
            if (!title) return;
            await apiFetch<{ section: Section }>(`/api/sections`, {
              method: 'POST',
              body: JSON.stringify({ title, teacherId }),
            });
            load(teacherId);
          }}><HiOutlinePlus className="h-5 w-5" /> Create New Section</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-hidden">
            {sections.map((s) => {
              const gradientClass = s.gradient;
              
              return (
                <Card key={s.id} className="p-3 sm:p-4 flex flex-col overflow-visible group">
                  <div className={`aspect-[3/2] rounded-lg ${gradientClass} mb-3 sm:mb-4 grid place-items-center text-white relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10 text-center">
                      <div className="font-futuristic font-bold text-lg leading-tight px-2">
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
                      <Button variant="ghost" className="flex-1 inline-flex items-center justify-center gap-2" onClick={() => router.push(`/modify/${s.id}`)}>
                        <HiOutlineUserGroup className="h-5 w-5" /> Roster
                      </Button>
                      <Button variant="ghost" className="flex-1 inline-flex items-center justify-center gap-2" onClick={() => router.push(`/history/${s.id}`)}>
                        <HiOutlineDocumentChartBar className="h-5 w-5" /> View Report
                      </Button>
                    </div>
                    <div className="flex gap-2 items-stretch flex-wrap">
                      {/* Activities dropdown (controlled) */}
                      <div className="relative flex-1" data-interact-menu={openMenuFor === s.id ? 'open' : undefined}>
                        <Button
                          variant="ghost"
                          className="inline-flex items-center gap-2 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuFor((prev) => (prev === s.id ? null : s.id));
                          }}
                          aria-haspopup="menu"
                          aria-expanded={openMenuFor === s.id}
                          data-activities-trigger={s.id}
                        >
                          <HiOutlineSparkles className="h-5 w-5" /> Activities
                          <HiChevronDown className={`h-4 w-4 opacity-70 transition-transform ${openMenuFor === s.id ? 'rotate-180' : ''}`} />
                        </Button>
                        {openMenuFor === s.id && (
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuFor(null)} aria-hidden>
                            {/* anchored menu */}
                            <div
                              className="absolute z-50 max-h-[60vh] overflow-auto min-w-[12rem] bg-white border rounded-xl shadow-soft p-1"
                              role="menu"
                              aria-label="Activities"
                              ref={(el) => {
                                if (!el) return;
                                const btn = document.querySelector(`[data-activities-trigger="${s.id}"]`) as HTMLElement | null;
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
                                  setWcSectionId(s.id);
                                  setWcOpen(true);
                                }}
                                role="menuitem"
                              >
                                <HiOutlineCloud className="h-5 w-5" /> Word Cloud
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Attendance button with responsive label */}
                      <Button className="flex-1 truncate" onClick={() => router.push(`/attendance/${s.id}`)}>
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
      
      <Button className="fixed right-6 rounded-full px-5 py-3 shadow-soft z-50 inline-flex items-center gap-2 border border-black" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }} onClick={() => setCreateModalOpen(true)}><HiOutlinePlus className="h-5 w-5" /> Create New Section</Button>

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
                // Optimistically remove and then refresh
                setSections((prev) => prev.filter((s) => s.id !== id));
                handleCloseCustomize();
                if (teacherId) {
                  try { await load(teacherId); } catch {/* ignore */}
                }
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
            <div className="flex gap-2 pt-2">
              <Button id="create-section-submit" onClick={async () => { if (!teacherId || !createTitle.trim()) return; await apiFetch(`/api/sections`, { method: 'POST', body: JSON.stringify({ title: createTitle.trim(), teacherId }) }); setCreateModalOpen(false); setCreateTitle(''); load(teacherId); }}>Create</Button>
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
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
              <Button onClick={startWordCloud} className="w-full inline-flex items-center justify-center gap-2" disabled={wcWorking}>
                {wcWorking ? 'Starting…' : 'Continue'}
              </Button>
            </div>
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
  section: Section; 
  gradients: Array<{ id: string; name: string; class: string }>;
  onSave: (title: string, gradient: string) => void;
  onCancel: () => void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(section.title);
  const [gradient, setGradient] = useState(section.gradient);
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
                  await apiFetch(`/api/sections/${section.id}`, { method: 'DELETE' });
                  await onDelete(section.id);
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
