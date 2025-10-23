import Constants from "expo-constants";

type EnvLike = { [k: string]: any };

const extra: EnvLike =
  (Constants?.expoConfig as any)?.extra ??
  (Constants as any)?.manifestExtra ??
  {};

const readBool = (key: string, def = false) => {
  const v = (extra?.[key] ??
    (typeof process !== "undefined"
      ? (process as any)?.env?.[key]
      : undefined)) as any;
  if (v === true || v === "true" || v === "1") return true;
  if (v === false || v === "false" || v === "0") return false;
  return def;
};

export const featureFlags = {
  authDisabled: readBool("EXPO_PUBLIC_AUTH_DISABLED", false),
  paymentsDevMode: readBool("EXPO_PUBLIC_PAYMENTS_DEV_MODE", false),
} as const;

export default featureFlags;
