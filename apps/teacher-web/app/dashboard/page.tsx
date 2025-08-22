"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, TextInput } from '@snaproll/ui';
import { apiFetch } from '@snaproll/api-client';

type Section = { id: string; title: string; gradient: string };

export default function DashboardPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [customizeModal, setCustomizeModal] = useState<{ open: boolean; section: Section | null }>({ open: false, section: null });

  const gradients = [
    { id: 'gradient-1', name: 'Purple Blue', class: 'gradient-1' },
    { id: 'gradient-2', name: 'Pink Red', class: 'gradient-2' },
    { id: 'gradient-3', name: 'Blue Cyan', class: 'gradient-3' },
    { id: 'gradient-4', name: 'Green Teal', class: 'gradient-4' },
    { id: 'gradient-5', name: 'Pink Yellow', class: 'gradient-5' },
    { id: 'gradient-6', name: 'Teal Pink', class: 'gradient-6' },
  ];

  useEffect(() => {
    setMounted(true);
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
  }, []);

  async function load(currentTeacherId: string) {
    const data = await apiFetch<{ sections: Section[] }>(`/api/sections?teacherId=${currentTeacherId}`);
    setSections(data.sections);
  }

  useEffect(() => {
    if (!mounted) return;
    if (teacherId) {
      load(teacherId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, teacherId]);

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
    
    setCustomizeModal({ open: false, section: null });
  }

  if (!mounted) return null;
  if (!teacherId) return <div>Please go back and enter your information.</div>;

  const hasSections = sections.length > 0;

  return (
    <div className="relative">
      {!hasSections ? (
        <Card className="p-8 text-center">
          <div className="text-lg font-medium">No sections yet</div>
          <div className="text-slate-500">Create your first section to begin.</div>
          <Button className="mt-4" onClick={async () => {
            const title = prompt('Section title?');
            if (!title) return;
            await apiFetch<{ section: Section }>(`/api/sections`, {
              method: 'POST',
              body: JSON.stringify({ title, teacherId }),
            });
            load(teacherId);
          }}>Create New Section</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-6 overflow-hidden">
          {sections.map((s) => {
            const gradientClass = s.gradient;
            
            return (
              <Card key={s.id} className="p-4 flex flex-col overflow-hidden group">
                <div className={`aspect-[3/2] rounded-lg ${gradientClass} mb-4 grid place-items-center text-white relative overflow-hidden`}>
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
                    title="Customize"
                  >
                    ✏️
                  </button>
                </div>
                <div className="font-medium mb-2 text-slate-700">{s.title}</div>
                <div className="mt-auto flex gap-2">
                  <Button variant="ghost" onClick={() => router.push(`/modify/${s.id}`)}>Roster</Button>
                  <Button variant="ghost" onClick={() => router.push(`/history/${s.id}`)}>View Report</Button>
                  <Button onClick={() => router.push(`/attendance/${s.id}`)}>Take Attendance</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      <Button className="fixed bottom-6 right-6 rounded-full px-5 py-3 shadow-soft" onClick={async () => {
        const title = prompt('Section title?');
        if (!title) return;
        await apiFetch<{ section: Section }>(`/api/sections`, {
          method: 'POST',
          body: JSON.stringify({ title, teacherId }),
        });
        load(teacherId);
      }}>+ Create New Section</Button>

      {/* Customize Modal */}
      {customizeModal.open && customizeModal.section && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Customize Section</h2>
              <button
                onClick={() => setCustomizeModal({ open: false, section: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <CustomizeModal 
              section={customizeModal.section}
              gradients={gradients}
              onSave={saveCustomization}
              onCancel={() => setCustomizeModal({ open: false, section: null })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CustomizeModal({ 
  section, 
  gradients, 
  onSave, 
  onCancel 
}: { 
  section: Section; 
  gradients: Array<{ id: string; name: string; class: string }>;
  onSave: (title: string, gradient: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [gradient, setGradient] = useState(section.gradient);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Section Title</label>
        <TextInput 
          value={title} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
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
      
      <div className="flex gap-2 pt-4">
        <Button onClick={() => onSave(title, gradient)} disabled={!title.trim()}>
          Save Changes
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
