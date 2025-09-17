import { useEffect, useMemo, useRef, useState } from 'react';

import type { ModerationDecision } from '../services/moderation';
import { moderateText } from '../services/moderation';

export type GuardResult = {
  decision: ModerationDecision | null;
  checking: boolean;
  canSend: boolean;
  helperText?: string;
};

export const useModerationGuard = (text: string, debounceMs = 300): GuardResult => {
  const [decision, setDecision] = useState<ModerationDecision | null>(null);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const trimmed = (text || '').trim();
    if (!trimmed) {
      setDecision(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const d = await moderateText(trimmed);
          setDecision(d);
        } finally {
          setChecking(false);
        }
      })();
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, debounceMs]);

  const canSend = useMemo(() => {
    if (!decision) return !!(text && text.trim());
    return decision.status === 'clean';
  }, [decision, text]);

  const helperText = useMemo(() => {
    if (!decision || decision.status === 'clean') return undefined;
    if (decision.status === 'flagged')
      return '不適切な可能性があるため送信できません。内容を修正してください。';
    if (decision.status === 'blocked') return 'ガイドライン違反のため送信できません。';
    return undefined;
  }, [decision]);

  return { decision, checking, canSend, helperText };
};

export default useModerationGuard;
