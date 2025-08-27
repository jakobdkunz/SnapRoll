"use client";
import { useEffect, useState } from 'react';
import { Card, TextInput } from '@snaproll/ui';
import { convexApi, api } from '@snaproll/convex-client';
import { useQuery } from 'convex/react';

type StudentProfile = { student: { id: string; email: string; firstName: string; lastName: string } };

export default function StudentProfilePage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Get student data
  const student = useQuery(api.functions.users.get, studentId ? { id: studentId as any } : "skip");

  useEffect(() => {
    const id = localStorage.getItem('snaproll.studentId');
    setStudentId(id);
  }, []);

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


