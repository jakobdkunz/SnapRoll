import { useMemo, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api, Id } from '@flamelink/convex-client';

export function useAttendanceActions(effectiveUserId?: Id<'users'> | null) {
  const checkInMutation = useMutation(api.functions.attendance.checkIn);
  const [checking, setChecking] = useState(false);
  const didSubmitRef = useRef<string | null>(null);

  const onCheckin = useMemo(() => {
    return async (code: string) => {
      if (!/^[0-9]{4}$/.test(code) || !effectiveUserId || checking) return { ok: false, error: 'Invalid code' as string | null, blockedUntil: null as number | null };
      try {
        setChecking(true);
        const result: unknown = await checkInMutation({ attendanceCode: code });
        if (result && typeof result === 'object' && result !== null && 'ok' in result) {
          const r = result as { ok: boolean; error?: string; attemptsLeft?: number; blockedUntil?: number };
          return { ok: r.ok, error: r.error || null, blockedUntil: r.blockedUntil ?? null };
        }
        return { ok: true, error: null, blockedUntil: null };
      } finally {
        setChecking(false);
        didSubmitRef.current = code;
      }
    };
  }, [effectiveUserId, checking, checkInMutation]);

  return { checking, onCheckin, didSubmitRef };
}


