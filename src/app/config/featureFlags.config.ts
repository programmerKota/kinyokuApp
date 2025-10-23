import Constants from "expo-constants";

const extra: Record<string, unknown> =
  ((Constants?.expoConfig as unknown) as { extra?: Record<string, unknown> })?.extra ??
  ((Constants as unknown) as { manifestExtra?: Record<string, unknown> })?.manifestExtra ??
  {};

const readBool = (key: string, def = false) => {
  const v =
    (extra?.[key] ??
      (typeof process !== "undefined"
        ? (process as unknown as { env?: Record<string, unknown> })?.env?.[key]
        : undefined)) ?? undefined;
  if (v === true || v === "true" || v === "1") return true;
  if (v === false || v === "false" || v === "0") return false;
  return def;
};

export const featureFlags = {
  authDisabled: readBool("EXPO_PUBLIC_AUTH_DISABLED", false),
  paymentsDevMode: readBool("EXPO_PUBLIC_PAYMENTS_DEV_MODE", false),
} as const;

export default featureFlags;
