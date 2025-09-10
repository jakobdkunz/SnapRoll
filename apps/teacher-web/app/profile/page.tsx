"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, TextInput } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery, useMutation } from 'convex/react';

type TeacherProfile = { teacher: { id: string; email: string; firstName: string; lastName: string } };

export default function TeacherProfilePage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("Demo Section");
  const [studentCount, setStudentCount] = useState(25);
  const [daysBack, setDaysBack] = useState(30);
  const [pctPresent, setPctPresent] = useState(50);
  const [pctPresentManual, setPctPresentManual] = useState(10);
  const [pctAbsentManual, setPctAbsentManual] = useState(20);
  const [pctBlank, setPctBlank] = useState(10);
  const [pctNotEnrolledManual, setPctNotEnrolledManual] = useState(10);
  const [generating, setGenerating] = useState(false);

  // Convex hooks
  const updateUser = useMutation(api.functions.users.update);
  const generateDemo = useMutation((api as any).functions.demo.generateDemoData);

  // Get teacher data
  const teacher = useQuery(api.functions.users.get, teacherId ? { id: teacherId as any } : "skip");

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
  }, []);

  // Update form when teacher data loads
  useEffect(() => {
    if (teacher) {
      setFirstName(teacher.firstName);
      setLastName(teacher.lastName);
      setEmail(teacher.email);
    }
  }, [teacher]);

  async function onSave() {
    if (!teacherId) return;
    setSaving(true);
    try {
      await updateUser({ id: teacherId as any, firstName, lastName });
      const name = `${firstName} ${lastName}`;
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

  const devMode = (process.env.NEXT_PUBLIC_DEV_MODE ?? "false") === "true";

  async function onGenerateDemo() {
    if (!devMode) return;
    setGenerating(true);
    try {
      const total = pctPresent + pctPresentManual + pctAbsentManual + pctBlank + pctNotEnrolledManual;
      if (total !== 100) {
        alert("Percentages must add up to 100%");
        return;
      }
      await generateDemo({
        sectionTitle,
        studentCount,
        daysBack,
        percentages: {
          present: pctPresent,
          presentManual: pctPresentManual,
          absentManual: pctAbsentManual,
          blank: pctBlank,
          notEnrolledManual: pctNotEnrolledManual,
        },
      });
      alert("Demo data generated");
    } finally {
      setGenerating(false);
    }
  }

  if (!teacherId) return null;
  if (!teacher) return <div>Loading...</div>;

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

        {devMode && (
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Developer Tools</div>
              <Button variant="secondary" onClick={() => setDevOpen(!devOpen)}>
                {devOpen ? 'Hide' : 'Show'}
              </Button>
            </div>
            {devOpen && (
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-sm text-slate-600">Demo section name</label>
                  <TextInput value={sectionTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSectionTitle(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">Students</label>
                    <TextInput type="number" value={studentCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentCount(Number(e.target.value || 0))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">Days (back from today)</label>
                    <TextInput type="number" value={daysBack} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDaysBack(Number(e.target.value || 0))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">% Present</label>
                    <TextInput type="number" value={pctPresent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctPresent(Number(e.target.value || 0))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">% Present (manual)</label>
                    <TextInput type="number" value={pctPresentManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctPresentManual(Number(e.target.value || 0))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">% Absent (manual)</label>
                    <TextInput type="number" value={pctAbsentManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctAbsentManual(Number(e.target.value || 0))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">% Blank (never manual)</label>
                    <TextInput type="number" value={pctBlank} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctBlank(Number(e.target.value || 0))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-slate-600">% Not Enrolled (manual)</label>
                    <TextInput type="number" value={pctNotEnrolledManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPctNotEnrolledManual(Number(e.target.value || 0))} />
                  </div>
                </div>
                <div className="text-xs text-slate-500">Percentages must add to 100%.</div>
                <Button onClick={onGenerateDemo} disabled={generating}>
                  {generating ? 'Generating…' : 'Generate demo data'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}


