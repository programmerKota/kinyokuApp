import Constants from 'expo-constants';

type EnvLike = { [k: string]: any };
const extra: EnvLike = (Constants?.expoConfig as any)?.extra ?? (Constants as any)?.manifestExtra ?? {};

const pick = (key: string): string | undefined => {
  const v = (extra?.[key] ?? process.env?.[key]) as unknown;
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
};

export const revenuecatConfig = {
  // Prefer platform-specific keys; fall back to single public key if provided
  iosPublicApiKey:
    pick('EXPO_PUBLIC_RC_IOS_PUBLIC_API_KEY') || pick('EXPO_PUBLIC_RC_API_KEY'),
  androidPublicApiKey:
    pick('EXPO_PUBLIC_RC_ANDROID_PUBLIC_API_KEY') || pick('EXPO_PUBLIC_RC_API_KEY'),
} as const;

export default revenuecatConfig;
