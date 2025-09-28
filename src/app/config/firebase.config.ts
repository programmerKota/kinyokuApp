import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { Platform } from "react-native";
import * as Device from "expo-device";

// Safe env accessors to avoid any-typed process.env on RN/Expo
type EnvLike = { [key: string]: string | undefined };
const ENV: EnvLike =
  typeof process !== "undefined" &&
  (process as unknown as { env?: EnvLike }).env
    ? ((process as unknown as { env?: EnvLike }).env as EnvLike)
    : ({} as EnvLike);
const getEnv = (key: string): string | undefined =>
  ENV[key] !== undefined ? ENV[key] : undefined;

// Read config from env so we can point to prod in builds
const firebaseConfig = {
  apiKey: getEnv("EXPO_PUBLIC_FIREBASE_API_KEY") || "demo-key",
  authDomain:
    getEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN") ||
    "demo-project.firebaseapp.com",
  projectId: getEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID") || "demo-project",
  storageBucket:
    getEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET") || "demo-project.appspot.com",
  messagingSenderId:
    getEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") || "123456789",
  appId: getEnv("EXPO_PUBLIC_FIREBASE_APP_ID") || "demo-app-id",
};

const app = initializeApp(firebaseConfig);

// Allow long polling to be toggled; default true on native, false on web
const forceLongPollingEnv = String(
  getEnv("EXPO_PUBLIC_FORCE_LONG_POLLING") || "",
).toLowerCase();
const experimentalForceLongPolling = forceLongPollingEnv
  ? forceLongPollingEnv === "true"
  : Platform.OS !== "web";

export const db = initializeFirestore(app, {
  experimentalForceLongPolling,
  ignoreUndefinedProperties: true,
});

// Functions instance (with region)
const functionsRegion = getEnv("EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION") || "us-central1";
export const fbFunctions = getFunctions(app, functionsRegion);

// Decide whether to use callable functions
const enableFunctionsEnv = String(getEnv("EXPO_PUBLIC_ENABLE_FUNCTIONS") || "").toLowerCase();
export const enableFunctionsCalls = enableFunctionsEnv
  ? enableFunctionsEnv === "true"
  : // default: enable in prod, disable on emulator/dev
    String(process.env.NODE_ENV).toLowerCase() === "production";

// Toggle emulator via env (support multiple var names) or auto-enable when demo config is used
const getBool = (v?: string) => String(v || "").toLowerCase() === "true";
const useEmulatorEnv =
  getBool(getEnv("EXPO_PUBLIC_USE_EMULATOR")) ||
  getBool(getEnv("EXPO_PUBLIC_USE_FIREBASE_EMULATOR")) ||
  getBool(getEnv("EXPO_PUBLIC_USE_FIRESTORE_EMULATOR"));

const usingDemoConfig =
  (firebaseConfig.projectId || "").includes("demo") ||
  firebaseConfig.apiKey === "demo-key" ||
  firebaseConfig.appId === "demo-app-id";

const isProd = String(process.env.NODE_ENV).toLowerCase() === "production";

// Utilities used for emulator config and export a resolved flag
const sanitize = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return undefined;
  if (trimmed.includes("${") || trimmed.startsWith("$")) return undefined;
  return trimmed;
};

const hostFromEnv = sanitize(getEnv("EXPO_PUBLIC_EMULATOR_HOST"));
const isRealDevice = Device.isDevice === true;
const shouldDisableOnRealDevice = !hostFromEnv && isRealDevice; // localhost is unreachable from real devices

export const useEmulator = (useEmulatorEnv || (!isProd && usingDemoConfig)) && !shouldDisableOnRealDevice;

if (useEmulator) {
  const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const host = hostFromEnv || defaultHost;

  try {
    if (shouldDisableOnRealDevice) {
      console.warn(
        "[firebase] emulator disabled on real device. Set EXPO_PUBLIC_EMULATOR_HOST to your dev machine IP to enable.",
      );
    } else {
      connectFirestoreEmulator(db, host, 8080);
      const auth = getAuth(app);
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      const storagePortEnv = getEnv("EXPO_PUBLIC_EMULATOR_STORAGE_PORT");
      const storagePort = storagePortEnv ? Number(storagePortEnv) : 9199;
      connectStorageEmulator(getStorage(app), host, storagePort);
      try {
        connectFunctionsEmulator(fbFunctions, host, 5001);
      } catch (e) {
        console.warn("[firebase] functions emulator connection failed:", e);
      }
      // eslint-disable-next-line no-console
      console.log(
        `[firebase] emulator connected: host=${host} firestore=8080 auth=9099 storage=${storagePort} functions=5001`,
      );
    }
  } catch (error) {
    console.warn("[firebase] emulator connection failed:", error);
  }
}

export { COLLECTIONS } from "@core/services/firestore/constants";

export default app;
