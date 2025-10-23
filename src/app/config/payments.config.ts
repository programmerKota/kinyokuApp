import Constants from "expo-constants";

const extra: Record<string, unknown> =
  ((Constants?.expoConfig as unknown) as { extra?: Record<string, unknown> })?.extra ??
  ((Constants as unknown) as { manifestExtra?: Record<string, unknown> })?.manifestExtra ??
  {};

const parseNumberCsv = (v: unknown): number[] => {
  if (typeof v !== "string") return [];
  return v
    .split(",")
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
};

export const paymentsConfig = {
  // UI で選べるペナルティ金額（JPY）。env未指定時のデフォルト。
  penaltyOptions: (() => {
    const fromEnv = parseNumberCsv(
      (extra as Record<string, unknown>).EXPO_PUBLIC_PENALTY_OPTIONS,
    );
    return fromEnv.length ? fromEnv : [0, 100, 500, 1000, 10000];
  })(),
} as const;

export default paymentsConfig;
