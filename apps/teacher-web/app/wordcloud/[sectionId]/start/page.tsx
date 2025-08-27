"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, TextInput } from '@snaproll/ui';
import { HiOutlineCloud, HiOutlinePlay } from 'react-icons/hi2';
import { convexApi, api } from '@snaproll/convex-client';
import { useMutation } from 'convex/react';
import { convex } from '@snaproll/convex-client';

export default function StartWordCloudPage({ params }: { params: { sectionId: string } }) {
  const router = useRouter();
  const sectionId = params.sectionId;
  const [open, setOpen] = useState(true);
  const [prompt, setPrompt] = useState('One word to describe how you feel');
  const [showPrompt, setShowPrompt] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);

  // Convex mutations
  const startWordCloud = useMutation(api.functions.wordcloud.startWordCloud);

  async function start() {
    try {
      const session = await startWordCloud({ 
        sectionId: sectionId as any, 
        prompt, 
        showPromptToStudents: showPrompt, 
        allowMultipleAnswers: allowMultiple 
      });
      setOpen(false);
      // delay to allow modal animation to dismiss before navigating
      setTimeout(() => router.push(`/wordcloud/live/${(session as any)._id}`), 120);
    } catch {
      alert('Failed to start word cloud. Please try again.');
    }
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
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="relative peer sr-only"
              checked={showPrompt}
              onChange={(e) => setShowPrompt(e.target.checked)}
            />
            <span
              className="inline-block w-5 h-5 rounded-md border border-slate-300 bg-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary grid place-items-center"
              aria-hidden
            >
                <svg className={`h-4 w-4 text-blue-500 ${showPrompt ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.435a1 1 0 111.414-1.414l3.051 3.051 6.657-6.657a1 1 0 011.293-.122z" clipRule="evenodd"/></svg>
            </span>
            <span>Show prompt on student devices</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="relative peer sr-only"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
            />
            <span
              className="inline-block w-5 h-5 rounded-md border border-slate-300 bg-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary grid place-items-center"
              aria-hidden
            >
                <svg className={`h-4 w-4 text-blue-500 ${allowMultiple ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.435a1 1 0 111.414-1.414l3.051 3.051 6.657-6.657a1 1 0 011.293-.122z" clipRule="evenodd"/></svg>
            </span>
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

