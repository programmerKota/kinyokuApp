import Constants from "expo-constants";

const extra: Record<string, unknown> =
  (Constants?.expoConfig as unknown as { extra?: Record<string, unknown> })
    ?.extra ??
  (Constants as unknown as { manifestExtra?: Record<string, unknown> })
    ?.manifestExtra ??
  {};

const pick = (key: string): string | undefined => {
  const value =
    extra?.[key] ??
    (typeof process !== "undefined"
      ? (process as unknown as { env?: Record<string, unknown> })?.env?.[key]
      : undefined);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const feedbackConfig = {
  email: pick("EXPO_PUBLIC_FEEDBACK_EMAIL"),
} as const;

export default feedbackConfig;
