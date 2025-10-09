import Constants from 'expo-constants';

type EnvLike = { [k: string]: any };

const extra: EnvLike = (Constants?.expoConfig as any)?.extra ?? (Constants as any)?.manifestExtra ?? {};

const readBool = (key: string, def = true) => {
  const v = (extra?.[key] ?? process.env?.[key]) as any;
  if (v === true || v === 'true' || v === '1') return true;
  if (v === false || v === 'false' || v === '0') return false;
  return def;
};

export const oauthConfig = {
  google: readBool('EXPO_PUBLIC_OAUTH_GOOGLE', false),
  twitter: readBool('EXPO_PUBLIC_OAUTH_TWITTER', false),
  amazon: readBool('EXPO_PUBLIC_OAUTH_AMAZON', false),
  line: readBool('EXPO_PUBLIC_OAUTH_LINE', false),
} as const;

export default oauthConfig;
