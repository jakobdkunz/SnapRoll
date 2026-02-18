"use client";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal, Button, TextInput } from '@flamelink/ui';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@flamelink/convex-client';
import type { Id } from '@flamelink/convex-client';

export default function PollStartModal({ open, onClose, sectionId, demoUserEmail }: { open: boolean; onClose: () => void; sectionId: Id<'sections'> | null; demoUserEmail?: string }) {
  const router = useRouter();
  const isDemoMode = (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false") === "true";
  const demoArgs = isDemoMode && demoUserEmail ? { demoUserEmail } : {};
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [countForCredit, setCountForCredit] = useState(false);
  const [working, setWorking] = useState(false);
  const startPollMutation = useMutation(api.functions.polls.startPoll);
  const section = useQuery(api.functions.sections.get, sectionId ? { id: sectionId as Id<'sections'>, ...demoArgs } : 'skip') as any;
  const participationEnabled = !!(section && (typeof section.participationCreditPointsPossible === 'number'));
  function setOptionAt(i: number, val: string) {
    setOptions((prev: string[]) => prev.map((v, idx) => (idx === i ? val : v)));
  }
  function addOption() {
    setOptions((prev: string[]) => [...prev, '']);
  }
  const visible = open && !!sectionId;
  return (
    <Modal open={visible} onClose={onClose}>
      <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg p-6 w-[90vw] max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Start Poll</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prompt</label>
            <TextInput value={prompt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)} placeholder="Type your prompt here..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <TextInput key={i} value={opt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptionAt(i, e.target.value)} placeholder={`Option ${i + 1}`} />
              ))}
              <TextInput
                value={''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (val.length === 0) return;
                  addOption();
                  setOptions((prev: string[]) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = val;
                    return copy;
                  });
                }}
                placeholder="Add another option..."
              />
            </div>
          </div>
          {participationEnabled && (
            <div className="flex items-center justify-between">
              <span>Count for Participation Credit</span>
              <button onClick={() => setCountForCredit(v => !v)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${countForCredit ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'}`} aria-pressed={countForCredit} aria-label="Toggle count for participation credit">
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-200 transition ${countForCredit ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={working || !sectionId || !prompt.trim() || options.filter((o) => o.trim()).length < 2} onClick={async () => {
              if (!sectionId) return;
              try {
                setWorking(true);
                const opts = options.map((o) => o.trim()).filter(Boolean);
                const sessionId = await (startPollMutation as unknown as (args: any) => Promise<unknown>)({ sectionId: sectionId as Id<'sections'>, prompt: prompt.trim(), options: opts, countForParticipationCredit: participationEnabled ? countForCredit : false, ...demoArgs });
                onClose();
                const sessionIdStr = typeof sessionId === 'string' ? sessionId : String((sessionId as unknown as { _id?: string })._id ?? sessionId);
                setTimeout(() => router.push(`/poll/live/${sessionIdStr}`), 120);
              } finally {
                setWorking(false);
              }
            }}>{working ? 'Starting…' : 'Start'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

