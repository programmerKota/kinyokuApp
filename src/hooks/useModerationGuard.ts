export type GuardResult = {
  decision: null;
  checking: boolean;
  canSend: boolean;
  helperText?: string;
};

export const useModerationGuard = (text: string): GuardResult => {
  const trimmed = (text || '').trim();
  return {
    decision: null,
    checking: false,
    canSend: trimmed.length > 0,
    helperText: undefined,
  };
};

export default useModerationGuard;
