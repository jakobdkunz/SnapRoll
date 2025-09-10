"use client";
import * as React from 'react';
import { Button, TextInput } from '@snaproll/ui';
import { HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';

export type RosterStudent = { id: string; email: string; firstName: string; lastName: string };

interface RosterRowProps {
  student: RosterStudent;
  isEditing: boolean;
  editEmail: string;
  editFirstName: string;
  editLastName: string;
  onChangeEmail: (v: string) => void;
  onChangeFirst: (v: string) => void;
  onChangeLast: (v: string) => void;
  onBeginEdit: (s: RosterStudent) => void;
  onCancelEdit: () => void;
  onSaveEdit: (studentId: string) => void;
  deleting: boolean;
  onRemove: () => Promise<void> | void;
}

export function RosterRow(props: RosterRowProps) {
  const {
    student: s,
    isEditing,
    editEmail,
    editFirstName,
    editLastName,
    onChangeEmail,
    onChangeFirst,
    onChangeLast,
    onBeginEdit,
    onCancelEdit,
    onSaveEdit,
    deleting,
    onRemove,
  } = props;

  return (
    <div className="p-3 border rounded-lg bg-white/50 flex flex-col sm:flex-row sm:items-center gap-3">
      {isEditing ? (
        <>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <TextInput
              placeholder="Email"
              value={editEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeEmail(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') { e.preventDefault(); onSaveEdit(s.id); }
              }}
            />
            <TextInput
              placeholder="First name"
              value={editFirstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeFirst(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') { e.preventDefault(); onSaveEdit(s.id); }
              }}
            />
            <TextInput
              placeholder="Last name"
              value={editLastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeLast(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') { e.preventDefault(); onSaveEdit(s.id); }
              }}
            />
          </div>
          <div className="sm:ml-auto flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={onCancelEdit}>Cancel</Button>
            <Button onClick={() => onSaveEdit(s.id)}>Save</Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{s.firstName} {s.lastName}</div>
            <div className="text-sm text-slate-500 truncate">{s.email}</div>
          </div>
          <div className="sm:ml-auto w-full sm:w-auto grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => onBeginEdit(s)} className="inline-flex items-center justify-center gap-2">
              <HiOutlinePencilSquare className="h-5 w-5" /> Edit
            </Button>
            <Button variant="ghost" onClick={onRemove} className="inline-flex items-center justify-center gap-2" disabled={deleting}>
              <HiOutlineTrash className="h-5 w-5" /> {deleting ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}


