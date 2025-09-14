"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal, Button, TextInput } from '@flamelink/ui';
import { useMutation } from 'convex/react';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';

export default function WordCloudStartModal({ open, onClose, sectionId }: { open: boolean; onClose: () => void; sectionId: Id<'sections'> | null }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('One word to describe how you feel');
  const [showPrompt, setShowPrompt] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startWordCloud = useMutation(api.functions.wordcloud.startWordCloud);
  const visible = open && !!sectionId;

  function hasId(v: unknown): v is { _id: string } {
    return typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>)._id === 'string';
  }

  return (
    <Modal open={visible} onClose={onClose}>
      <div className="bg-white rounded-lg p-6 w-[90vw] max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 text-lg font-semibold">Start Word Cloud</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
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
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>
          )}
          <div className="pt-2">
            <Button onClick={async () => {
              if (!sectionId) return;
              if (!prompt.trim()) { setError('Please enter a prompt.'); return; }
              try {
                setWorking(true);
                setError(null);
                const sessionId = await startWordCloud({ sectionId: sectionId as Id<'sections'>, prompt, showPromptToStudents: showPrompt, allowMultipleAnswers: allowMultiple });
                onClose();
                const idStr = hasId(sessionId) ? sessionId._id : String(sessionId);
                setTimeout(() => router.push(`/wordcloud/live/${idStr}`), 120);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Failed to start word cloud. Please try again.');
              } finally {
                setWorking(false);
              }
            }} className="w-full inline-flex items-center justify-center gap-2" disabled={working}>
              {working ? 'Starting…' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


