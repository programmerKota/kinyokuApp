import Constants from "expo-constants";

const extra: Record<string, unknown> =
  (Constants?.expoConfig as unknown as { extra?: Record<string, unknown> })
    ?.extra ??
  (Constants as unknown as { manifestExtra?: Record<string, unknown> })
    ?.manifestExtra ??
  {};

const pick = (key: string): string | undefined => {
  const v = (extra?.[key] ?? process.env?.[key]) as unknown;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

export const revenuecatConfig = {
  // Prefer platform-specific keys; fall back to single public key if provided
  iosPublicApiKey:
    pick("EXPO_PUBLIC_RC_IOS_PUBLIC_API_KEY") || pick("EXPO_PUBLIC_RC_API_KEY"),
  androidPublicApiKey:
    pick("EXPO_PUBLIC_RC_ANDROID_PUBLIC_API_KEY") ||
    pick("EXPO_PUBLIC_RC_API_KEY"),
  // Offering key used for penalty purchase flow (fallback: 'penalty')
  penaltyOfferingKey: pick("EXPO_PUBLIC_RC_PENALTY_OFFERING") || "penalty",
} as const;

export default revenuecatConfig;
