import Constants from "expo-constants";

// Robust boolean reader for EAS builds:
// - Prefer app.json "extra" (manifestExtra in prod)
// - Fall back to statically-replaced EXPO_PUBLIC_* envs (must use direct keys)
const extra: Record<string, unknown> =
  (Constants?.expoConfig as unknown as { extra?: Record<string, unknown> })
    ?.extra ??
  (Constants as unknown as { manifestExtra?: Record<string, unknown> })
    ?.manifestExtra ??
  {};

const toBool = (v: unknown, def = false) => {
  if (v === true || v === "true" || v === "1") return true;
  if (v === false || v === "false" || v === "0") return false;
  return def;
};

const google = toBool(
  extra?.EXPO_PUBLIC_OAUTH_GOOGLE ??
    (typeof process !== "undefined"
      ? (process as unknown as { env?: Record<string, unknown> })?.env
          ?.EXPO_PUBLIC_OAUTH_GOOGLE
      : undefined),
  false,
);
const twitter = toBool(
  extra?.EXPO_PUBLIC_OAUTH_TWITTER ??
    (typeof process !== "undefined"
      ? (process as unknown as { env?: Record<string, unknown> })?.env
          ?.EXPO_PUBLIC_OAUTH_TWITTER
      : undefined),
  false,
);
const amazon = toBool(
  extra?.EXPO_PUBLIC_OAUTH_AMAZON ??
    (typeof process !== "undefined"
      ? (process as unknown as { env?: Record<string, unknown> })?.env
          ?.EXPO_PUBLIC_OAUTH_AMAZON
      : undefined),
  false,
);
const apple = toBool(
  extra?.EXPO_PUBLIC_OAUTH_APPLE ??
    (typeof process !== "undefined"
      ? (process as unknown as { env?: Record<string, unknown> })?.env
          ?.EXPO_PUBLIC_OAUTH_APPLE
      : undefined),
  false,
);
const line = toBool(
  extra?.EXPO_PUBLIC_OAUTH_LINE ??
    (typeof process !== "undefined"
      ? (process as unknown as { env?: Record<string, unknown> })?.env
          ?.EXPO_PUBLIC_OAUTH_LINE
      : undefined),
  false,
);

// Disable OAuth in Expo Go (only works reliably in EAS Dev Client or production)
const isExpoGo =
  (Constants as unknown as { appOwnership?: string })?.appOwnership === "expo";

export const oauthConfig = {
  google: !isExpoGo && google,
  twitter: !isExpoGo && twitter,
  amazon: !isExpoGo && amazon,
  apple: !isExpoGo && apple,
  line: !isExpoGo && line,
} as const;

export default oauthConfig;
