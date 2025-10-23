import Constants from 'expo-constants';

type EnvLike = { [k: string]: any };
const extra: EnvLike = (Constants?.expoConfig as any)?.extra ?? (Constants as any)?.manifestExtra ?? {};

const parseNumberCsv = (v: unknown): number[] => {
  if (typeof v !== 'string') return [];
  return v
    .split(',')
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
};

export const paymentsConfig = {
  // UI で選べるペナルティ金額（JPY）。env未指定時のデフォルト。
  penaltyOptions: (() => {
    const fromEnv = parseNumberCsv(extra.EXPO_PUBLIC_PENALTY_OPTIONS);
    return fromEnv.length ? fromEnv : [0, 100, 500, 1000, 10000];
  })(),
} as const;

export default paymentsConfig;

