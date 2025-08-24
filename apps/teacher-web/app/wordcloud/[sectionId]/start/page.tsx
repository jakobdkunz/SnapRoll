"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Modal, TextInput } from '@snaproll/ui';
import { HiOutlineCloud, HiOutlinePlay } from 'react-icons/hi2';
import { apiFetch } from '@snaproll/api-client';

export default function StartWordCloudPage({ params }: { params: { sectionId: string } }) {
  const router = useRouter();
  const sectionId = params.sectionId;
  const [open, setOpen] = useState(true);
  const [prompt, setPrompt] = useState('One word to describe how you feel');
  const [showPrompt, setShowPrompt] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);

  async function start() {
    const { session } = await apiFetch<{ session: { id: string } }>(`/api/sections/${sectionId}/wordcloud/start`, {
      method: 'POST',
      body: JSON.stringify({ prompt, showPromptToStudents: showPrompt, allowMultipleAnswers: allowMultiple }),
    });
    router.push(`/wordcloud/live/${session.id}`);
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)}>
      <div className="bg-white rounded-lg p-6 w-[90vw] max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 text-lg font-semibold"><HiOutlineCloud className="h-6 w-6" /> Start Word Cloud</div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Prompt</label>
            <TextInput value={prompt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)} placeholder="Enter prompt" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showPrompt} onChange={(e) => setShowPrompt(e.target.checked)} />
            <span>Show prompt on student devices</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} />
            <span>Allow multiple answers</span>
          </label>
          <div className="pt-2">
            <Button onClick={start} className="w-full inline-flex items-center justify-center gap-2"><HiOutlinePlay className="h-5 w-5" /> Continue</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

