import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api, Id } from '@flamelink/convex-client';
import { useCurrentUser } from '../auth/useCurrentUser';

export type InteractiveUI =
  | null
  | undefined
  | { kind: 'wordcloud'; sessionId: string; sectionId?: string; prompt?: string; showPromptToStudents?: boolean; allowMultipleAnswers?: boolean; hasSubmitted?: boolean }
  | { kind: 'poll'; sessionId: string; sectionId?: string; prompt?: string; options: string[]; hasSubmitted?: boolean }
  | { kind: 'slideshow'; sessionId: string; sectionId?: string; showOnDevices?: boolean }
  | { kind: 'bible'; sessionId: string; sectionId?: string; reference?: string; translationId?: string; translationName?: string; text?: string; versesJson?: string | null };

export function useActiveInteractive(): InteractiveUI {
  const currentUser = useCurrentUser();
  const effectiveUserId = (currentUser?._id as Id<'users'> | undefined);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const interactive = useQuery(
    api.functions.students.getActiveInteractive,
    effectiveUserId ? { studentId: effectiveUserId, tick } : "skip"
  );

  const anyInt = interactive as Record<string, unknown> | null | undefined;
  if (anyInt === undefined) return undefined;
  if (anyInt === null) return null;
  if (anyInt && typeof anyInt === 'object') {
    if (anyInt['kind'] === 'wordcloud') {
      return {
        kind: 'wordcloud',
        sessionId: String(anyInt['sessionId']),
        sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
        prompt: typeof anyInt['prompt'] === 'string' ? (anyInt['prompt'] as string) : undefined,
        showPromptToStudents: typeof anyInt['showPromptToStudents'] === 'boolean' ? (anyInt['showPromptToStudents'] as boolean) : undefined,
        allowMultipleAnswers: typeof anyInt['allowMultipleAnswers'] === 'boolean' ? (anyInt['allowMultipleAnswers'] as boolean) : undefined,
        hasSubmitted: typeof anyInt['hasSubmitted'] === 'boolean' ? (anyInt['hasSubmitted'] as boolean) : undefined,
      };
    }
    if (anyInt['kind'] === 'poll') {
      return {
        kind: 'poll',
        sessionId: String(anyInt['sessionId']),
        sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
        prompt: typeof anyInt['prompt'] === 'string' ? (anyInt['prompt'] as string) : undefined,
        options: Array.isArray(anyInt['options']) ? (anyInt['options'] as unknown[]).map((o: unknown) => String(o)) : [],
        hasSubmitted: typeof anyInt['hasSubmitted'] === 'boolean' ? (anyInt['hasSubmitted'] as boolean) : undefined,
      };
    }
    if (anyInt['kind'] === 'slideshow') {
      return {
        kind: 'slideshow',
        sessionId: String(anyInt['sessionId']),
        sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
        showOnDevices: typeof anyInt['showOnDevices'] === 'boolean' ? (anyInt['showOnDevices'] as boolean) : undefined,
      };
    }
    if (anyInt['kind'] === 'bible') {
      return {
        kind: 'bible',
        sessionId: String(anyInt['sessionId']),
        sectionId: anyInt['sectionId'] ? String(anyInt['sectionId']) : undefined,
        reference: typeof anyInt['reference'] === 'string' ? (anyInt['reference'] as string) : undefined,
        translationId: typeof anyInt['translationId'] === 'string' ? (anyInt['translationId'] as string) : undefined,
        translationName: typeof anyInt['translationName'] === 'string' ? (anyInt['translationName'] as string) : undefined,
        text: typeof anyInt['text'] === 'string' ? (anyInt['text'] as string) : undefined,
        versesJson: typeof anyInt['versesJson'] === 'string' ? (anyInt['versesJson'] as string) : null,
      };
    }
  }
  return undefined;
}


