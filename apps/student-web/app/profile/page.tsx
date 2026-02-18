"use client";
import { useEffect, useState } from 'react';
import { Card, TextInput } from '@flamelink/ui';
import { api } from '@flamelink/convex-client';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useDemoUser } from '../_components/DemoUserContext';

type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

export default function StudentProfilePage() {
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  const { demoUserEmail } = useDemoUser();
  const demoArgs = isDemoMode ? { demoUserEmail } : {};
  const [studentId, setStudentId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const currentUser = useQuery(
    api.functions.auth.getCurrentUser,
    isDemoMode ? { demoUserEmail } : {}
  );

  // Get student data
  const student = useQuery(api.functions.users.get, studentId ? { id: studentId as unknown as Id<'users'>, ...demoArgs } : "skip");

  useEffect(() => {
    if (currentUser?._id) {
      setStudentId(currentUser._id as unknown as string);
      return;
    }
    if (!isDemoMode) {
      const id = localStorage.getItem('flamelink.studentId');
      setStudentId(id);
    }
  }, [currentUser, isDemoMode]);

  // Update form when student data loads
  useEffect(() => {
    if (student) {
      setFirstName(student.firstName);
      setLastName(student.lastName);
      setEmail(student.email);
    }
  }, [student]);

  if (!studentId) return null;
  if (!student) return <div>Loading...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">Your Profile</div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">First name</label>
          <TextInput value={firstName} disabled />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Last name</label>
          <TextInput value={lastName} disabled />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Email</label>
          <TextInput value={email} disabled />
        </div>
      </Card>
    </div>
  );
}
