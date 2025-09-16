import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Firebase設定（エミュレーター用のダミー設定）
const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id",
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// 各サービスの初期化
// Expo Go + トンネル環境での接続問題に備えて、デフォルトでlong pollingを使用
const expoExtra: any =
  (Constants as any).expoConfig?.extra ||
  (Constants as any).manifest?.extra ||
  {};
const forceLongPolling =
  (expoExtra.EXPO_PUBLIC_FORCE_LONG_POLLING ??
    process.env.EXPO_PUBLIC_FORCE_LONG_POLLING ??
    "true") === "true";
const useEmulator = true; // 常にエミュレーターを使用

// タイムアウト設定
const firebaseTimeout = Number(
  expoExtra.EXPO_PUBLIC_FIREBASE_TIMEOUT ??
    process.env.EXPO_PUBLIC_FIREBASE_TIMEOUT ??
    30000
);

// initializeFirestoreで設定を確実に適用
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  // タイムアウト設定を追加
  ignoreUndefinedProperties: true,
  // メッセージポートエラー対策
  localCache: {
    kind: "persistent",
    tabManager: "none",
    // キャッシュサイズをlocalCache内で指定
    cacheSizeBytes: 1048576, // 1MB
  },
} as any);

if (useEmulator) {
  // Dockerで構築したFirebaseエミュレーターに接続
  // 実行環境に応じて接続先ホストを切り替え（環境変数で上書き可能）
  const rawHost = (expoExtra.EXPO_PUBLIC_EMULATOR_HOST ?? process.env.EXPO_PUBLIC_EMULATOR_HOST) as
    | string
    | undefined;
  const sanitize = (v?: string) => {
    if (!v) return undefined;
    const s = String(v).trim();
    // 未展開のプレースホルダや空文字、$... は無効として扱う
    if (!s || s === 'undefined' || s === 'null') return undefined;
    if (s.includes('${') || s.startsWith('$')) return undefined;
    return s;
  };
  const hostFromEnv = sanitize(rawHost);
  const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
  const host = hostFromEnv || defaultHost; // 物理端末から接続する場合は EXPO_PUBLIC_EMULATOR_HOST にPCのLAN IPを設定

  try {
    // Dockerで構築したFirebaseエミュレーターに接続
    connectFirestoreEmulator(db, host, 8080);
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${host}:9099`, {
      disableWarnings: true,
    });

    // Storageエミュレーターに接続（Dockerのポートフォワーディング: 9198->9199）
    connectStorageEmulator(getStorage(app), host, 9198);

    // Debug log
    console.log(
      `[firebase] emulator connected: host=${host} firestore=8080 auth=9099 storage=9198`
    );
  } catch (error) {
    console.warn("[firebase] emulator connection failed:", error);
    // エミュレーター接続に失敗した場合は本番環境を使用
  }
}
// storage インスタンスのエクスポートは未使用のため削除

// Firestoreコレクション名の定義
export const COLLECTIONS = {
  USERS: "users",
  CHALLENGES: "challenges",
  TOURNAMENTS: "tournaments",
  TOURNAMENT_PARTICIPANTS: "tournamentParticipants",
  TOURNAMENT_MESSAGES: "tournamentMessages",
  COMMUNITY_POSTS: "communityPosts",
  COMMUNITY_REPLIES: "communityReplies",
  FOLLOWS: "follows",
  RANKINGS: "rankings",
  SYSTEM: "system",
} as const;

export default app;
