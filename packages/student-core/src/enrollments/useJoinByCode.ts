import { useCallback, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@flamelink/convex-client';

export function useJoinByCode() {
  const joinByCode = useMutation(api.functions.enrollments.joinByCode);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (code: string) => {
    if (!/^[0-9]{6}$/.test(code)) {
      setError('Enter a 6-digit join code.');
      return { ok: false as const };
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await joinByCode({ code });
      if (res && typeof res === 'object' && (res as { ok?: boolean }).ok) {
        return { ok: true as const };
      } else if (res && typeof res === 'object' && (res as { error?: unknown }).error) {
        const errVal = (res as { error?: unknown }).error;
        setError(typeof errVal === 'string' ? errVal : 'Failed to join. Try again.');
        return { ok: false as const };
      }
      setError('Failed to join. Try again.');
      return { ok: false as const };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join.';
      setError(/no course/i.test(msg) ? 'No course matches that join code.' : 'Failed to join. Try again.');
      return { ok: false as const };
    } finally {
      setSubmitting(false);
    }
  }, [joinByCode]);

  return { submit, error, setError, submitting };
}


