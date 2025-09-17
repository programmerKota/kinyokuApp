import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { Platform } from "react-native";

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
const useEmulator = useEmulatorEnv || (!isProd && usingDemoConfig);

if (useEmulator) {
  const sanitize = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null")
      return undefined;
    if (trimmed.includes("${") || trimmed.startsWith("$")) return undefined;
    return trimmed;
  };

  const hostFromEnv = sanitize(getEnv("EXPO_PUBLIC_EMULATOR_HOST"));
  const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const host = hostFromEnv || defaultHost;

  try {
    connectFirestoreEmulator(db, host, 8080);
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectStorageEmulator(getStorage(app), host, 9198);
    // eslint-disable-next-line no-console
    console.log(
      `[firebase] emulator connected: host=${host} firestore=8080 auth=9099 storage=9198`,
    );
  } catch (error) {
    console.warn("[firebase] emulator connection failed:", error);
  }
}

export { COLLECTIONS } from "../services/firestore/constants";

export default app;
