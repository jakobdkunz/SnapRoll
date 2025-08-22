"use client";
import { useEffect, useState } from 'react';
import { Card, Badge } from '@snaproll/ui';
import { formatDateMDY } from '@snaproll/lib';
import { apiFetch } from '@snaproll/api-client';
import { useParams } from 'next/navigation';

type Student = { id: string; firstName: string; lastName: string; email: string };
type Day = { id: string; date: string; attendanceCode: string };
type Record = { 
  classDayId: string; 
  studentId: string; 
  status: Status; 
  isManual: boolean;
  originalStatus: Status; // Add this field to track original status
  manualChange?: {
    status: Status;
    teacherName: string;
    createdAt: string;
  };
};
type StudentRecord = { studentId: string; records: Record[] };

type Status = 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'NOT_JOINED' | 'BLANK';

export default function HistoryPage() {
  const params = useParams<{ id: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('snaproll.teacherId');
    setTeacherId(id);
    
    if (id) {
      loadHistory();
    }
  }, [params.id]);

  async function loadHistory() {
    try {
      const data = await apiFetch<{ 
        students: Student[]; 
        days: Day[]; 
        records: StudentRecord[] 
      }>(`/api/sections/${params.id}/history`);
      
      setStudents(data.students);
      setDays(data.days);
      setStudentRecords(data.records);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(classDayId: string, studentId: string, newStatus: Status) {
    if (!teacherId) return;
    
    try {
      await apiFetch(`/api/sections/${params.id}/history/manual-status`, {
        method: 'POST',
        body: JSON.stringify({
          classDayId,
          studentId,
          status: newStatus,
          teacherId
        })
      });
      
      // Reload history to get updated data
      await loadHistory();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  function renderStatusCell(record: Record, studentName: string, date: string) {
    const status = record.status;
    const isManual = record.isManual;
    const originalStatus = record.originalStatus;
    
    // Only show manual indicators if the status is actually different from original
    const showManualIndicators = isManual && status !== originalStatus;
    
    const statusOptions: { value: Status; label: string; disabled?: boolean }[] = [
      { value: 'PRESENT', label: 'P' },
      { value: 'ABSENT', label: 'A' },
      { value: 'EXCUSED', label: 'E' },
      { value: 'BLANK', label: '–', disabled: originalStatus !== 'BLANK' }
    ];

    const statusDisplay = (() => {
      switch (status) {
        case 'PRESENT':
          return <Badge tone="green">P{showManualIndicators ? '*' : ''}</Badge>;
        case 'ABSENT':
          return <Badge tone="red">A{showManualIndicators ? '*' : ''}</Badge>;
        case 'EXCUSED':
          return <Badge tone="yellow">E{showManualIndicators ? '*' : ''}</Badge>;
        case 'NOT_JOINED':
          return <Badge tone="gray">NJ{showManualIndicators ? '*' : ''}</Badge>;
        default:
          return <span className="text-slate-400">–{showManualIndicators ? '*' : ''}</span>;
      }
    })();

    // Generate tooltip text based on whether it's a manual change or original status
    let tooltipText = '';
    if (showManualIndicators && record.manualChange) {
      tooltipText = `${record.manualChange.teacherName} manually changed the status to ${status} on ${formatDateMDY(new Date(record.manualChange.createdAt))}`;
    } else {
      // Standard attendance tooltip
      switch (status) {
        case 'PRESENT':
          tooltipText = `${studentName} was Present in class on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'ABSENT':
          tooltipText = `${studentName} was Absent on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'EXCUSED':
          tooltipText = `${studentName} was Excused on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'NOT_JOINED':
          tooltipText = `${studentName} did not join the section on ${formatDateMDY(new Date(date))}.`;
          break;
        case 'BLANK':
          tooltipText = `No attendance recorded for ${studentName} on ${formatDateMDY(new Date(date))}.`;
          break;
      }
    }

    return (
      <div className="relative group">
        <select
          value={status}
          onChange={(e) => updateStatus(record.classDayId, record.studentId, e.target.value as Status)}
          className="appearance-none bg-transparent border-none cursor-pointer text-center w-full h-full p-2 focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          {statusOptions.map(option => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {statusDisplay}
        </div>
        {tooltipText && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
            {tooltipText}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <div>Loading history...</div>;
  }

  return (
    <Card className="p-4 overflow-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white p-2 text-left">Student</th>
            {days.map((day) => (
              <th key={day.id} className="p-2 text-sm font-medium text-slate-600">
                {formatDateMDY(new Date(day.date))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student, i) => (
            <tr key={student.id} className="odd:bg-slate-50">
              <td className="sticky left-0 z-10 bg-white px-2 py-1 text-sm">
                <div className="font-medium">{student.firstName} {student.lastName}</div>
                <div className="text-xs text-slate-500">{student.email}</div>
              </td>
              {days.map((day, j) => {
                const record = studentRecords[i]?.records[j];
                return (
                  <td key={`${student.id}-${day.id}`} className="p-2 text-center">
                    {record ? renderStatusCell(record, `${student.firstName} ${student.lastName}`, day.date) : <span className="text-slate-400">–</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
