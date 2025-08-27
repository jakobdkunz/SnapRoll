"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Card, Badge, Button } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery, useMutation } from 'convex/react';
import { convex } from '@snaproll/convex-client';

type CheckinResponse = {
  ok: boolean;
  record?: any;
  status?: string;
  section?: { id: string; title: string };
  error?: string;
};

type Section = {
  id: string;
  title: string;
  gradient: string;
};

export default function SectionsPage() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Convex hooks
  const checkInMutation = useMutation(api.attendance.checkIn);
  
  // Get student data
  const student = useQuery(api.users.get, studentId ? { id: studentId } : "skip");
  
  // Get student's enrolled sections
  const enrollments = useQuery(api.enrollments.getByStudent, studentId ? { studentId } : "skip");
  
  // Get sections data
  const sectionsData = useQuery(api.sections.list);
  
  // Combine enrollments with sections data
  const sections = useMemo(() => {
    if (!enrollments || !sectionsData) return [];
    return enrollments.map(enrollment => {
      const section = sectionsData.find(s => s._id === enrollment.sectionId);
      return section ? {
        id: section._id,
        title: section.title,
        gradient: section.gradient || 'gradient-1'
      } : null;
    }).filter(Boolean) as Section[];
  }, [enrollments, sectionsData]);

  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Submit when 4 digits are present
  const onCheckin = async () => {
    setConfirmMsg(null);
    setCheckinError(null);
    const code = digits.join('');
    if (!/^[0-9]{4}$/.test(code) || !studentId || checking) return;
    try {
      setChecking(true);
      
      // Use Convex mutation
      const recordId = await checkInMutation({ attendanceCode: code, studentId });
      
      if (recordId) {
        setConfirmMsg(`Checked in successfully!`);
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      } else {
        setCheckinError('Failed to check in. Please try again.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to check in.';
      setCheckinError(msg);
    } finally {
      setChecking(false);
    }
  };

  // Inline check-in widget state (must be declared before any returns)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  // Interactive state
  type InteractiveWordCloud = {
    kind: 'wordcloud';
    sessionId: string;
    prompt: string;
    showPromptToStudents: boolean;
    allowMultipleAnswers: boolean;
    sectionId: string;
    hasAnswered?: boolean;
  };
  type InteractivePoll = {
    kind: 'poll';
    sessionId: string;
    prompt: string;
    options: string[];
    showResults: boolean;
    sectionId: string;
    hasAnswered?: boolean;
  };
  type InteractiveSlideshow = {
    kind: 'slideshow';
    sessionId: string;
    title: string;
    filePath: string;
    mimeType: string;
    currentSlide: number;
    totalSlides: number | null;
    showOnDevices: boolean;
    allowDownload: boolean;
    requireStay: boolean;
    preventJump: boolean;
    sectionId: string;
  };


  const [answer, setAnswer] = useState('');
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const submittedOnceRef = useRef<boolean>(false);
  const lastSeenRef = useRef<number>(Date.now());

  // Get interactive activity from Convex
  const interactive = useQuery(api.students.getActiveInteractive, studentId ? { studentId } : "skip");

  // Reset local single-submit state when a new session starts
  useEffect(() => {
    submittedOnceRef.current = false;
    setSubmitMsg(null);
    setAnswer('');
  }, [interactive?.sessionId]);

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [checking, setChecking] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsClient(true);
    // Use a longer delay to ensure localStorage is available and retry if needed
    const timer = setTimeout(() => {
      const id = localStorage.getItem('snaproll.studentId');
      if (id) {
        setStudentId(id);
      } else {
        // Retry once more after a longer delay
        setTimeout(() => {
          const retryId = localStorage.getItem('snaproll.studentId');
          setStudentId(retryId);
        }, 500);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // Set student name from Convex data
  useEffect(() => {
    if (student) {
      setStudentName(`${student.firstName} ${student.lastName}`);
    }
  }, [student]);



  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (digits.every(d => d !== '') && digits.join('').length === 4) {
      onCheckin();
    }
  }, [digits]);

  if (!mounted) return null;

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const numbers = pastedData.replace(/\D/g, '').slice(0, 4).split('');
    const newDigits = [...digits];
    numbers.forEach((num, index) => {
      if (index < 4) newDigits[index] = num;
    });
    setDigits(newDigits);
    if (numbers.length === 4) {
      inputRefs[3].current?.focus();
    }
  };

  return (
    <div className="min-h-dvh px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-slate-800 mb-2">
            Welcome{studentName ? `, ${studentName}` : ''}!
          </h1>
          <p className="text-slate-600">Enter your attendance code to check in</p>
        </div>

        <Card className="p-6 max-w-sm mx-auto">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Attendance Code</h2>
              <p className="text-sm text-slate-600 mb-4">Enter the 4-digit code from your instructor</p>
            </div>

            <div className="flex gap-2 justify-center">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-lg font-semibold border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  disabled={checking}
                />
              ))}
            </div>

            {checkinError && (
              <div className="text-center text-red-600 text-sm">{checkinError}</div>
            )}

            {confirmMsg && (
              <div className="text-center text-green-600 text-sm">{confirmMsg}</div>
            )}

            <Button
              onClick={onCheckin}
              disabled={digits.join('').length !== 4 || checking}
              className="w-full"
            >
              {checking ? 'Checking in...' : 'Check In'}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 text-center">Your Sections</h2>
          
          {!enrollments || !sectionsData ? (
            <div className="text-center text-slate-600">Loading sections...</div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : sections.length === 0 ? (
            <div className="text-center text-slate-600">No sections found. Please ask your instructor to add you to a section.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <Card key={section.id} className={`p-4 ${section.gradient} text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{section.title}</h3>
                      {checkedInIds.includes(section.id) && (
                        <Badge tone="green" className="mt-1">Checked In</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
