import { doc, onSnapshot } from "firebase/firestore";

import { getWordList } from "./wordListService";
import { db } from "../config/firebase.config";

export type ModerationPolicy = {
  harassTerms: string[];
  sexualTermsJa: string[];
  sexualTermsEn: string[];
  allowTerms: string[];
  blockThreshold: number; // severity >= blockThreshold -> blocked
  flagThreshold: number; // severity >= flagThreshold -> flagged
  fuzzyGapChars: string; // character class used as gap between letters in fuzzy match
};

const defaultPolicy: ModerationPolicy = {
  // 最小限のフォールバック用語（外部リソースが利用できない場合のみ使用）
  harassTerms: [],
  sexualTermsJa: [],
  sexualTermsEn: [],
  allowTerms: [],
  blockThreshold: 5,
  flagThreshold: 3,
  // Japanese/latin spaces and common separators
  fuzzyGapChars: "\\u3000\\s_-.・〜~／/\\\\|\\*",
};

let activePolicy: ModerationPolicy = defaultPolicy;
let started = false;
let externalWordListLoaded = false;

export function getModerationPolicy(): ModerationPolicy {
  if (!started) startPolicySubscription();
  if (!externalWordListLoaded) loadExternalWordList();
  return activePolicy;
}

function startPolicySubscription() {
  try {
    const ref = doc(db, "system", "moderation_policy");
    onSnapshot(ref, (snap) => {
      const data = snap.data() as Partial<ModerationPolicy> | undefined;
      if (data) {
        activePolicy = {
          ...defaultPolicy,
          ...data,
          harassTerms: data.harassTerms ?? defaultPolicy.harassTerms,
          sexualTermsJa: data.sexualTermsJa ?? defaultPolicy.sexualTermsJa,
          sexualTermsEn: data.sexualTermsEn ?? defaultPolicy.sexualTermsEn,
          allowTerms: data.allowTerms ?? defaultPolicy.allowTerms,
          blockThreshold: data.blockThreshold ?? defaultPolicy.blockThreshold,
          flagThreshold: data.flagThreshold ?? defaultPolicy.flagThreshold,
          fuzzyGapChars: data.fuzzyGapChars ?? defaultPolicy.fuzzyGapChars,
        };
      }
    });
  } catch {
    // Firestore 利用不可でもデフォルトで継続
  } finally {
    started = true;
  }
}

function applyPolicy(data: Partial<ModerationPolicy>) {
  activePolicy = {
    ...defaultPolicy,
    ...data,
    harassTerms: data.harassTerms ?? defaultPolicy.harassTerms,
    sexualTermsJa: data.sexualTermsJa ?? defaultPolicy.sexualTermsJa,
    sexualTermsEn: data.sexualTermsEn ?? defaultPolicy.sexualTermsEn,
    allowTerms: data.allowTerms ?? defaultPolicy.allowTerms,
    blockThreshold: data.blockThreshold ?? defaultPolicy.blockThreshold,
    flagThreshold: data.flagThreshold ?? defaultPolicy.flagThreshold,
    fuzzyGapChars: data.fuzzyGapChars ?? defaultPolicy.fuzzyGapChars,
  };
}

async function fetchRemotePolicy() {
  const url = process.env.EXPO_PUBLIC_MOD_POLICY_URL as string | undefined;
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const json = await res.json();
    if (json && typeof json === "object") {
      applyPolicy(json as Partial<ModerationPolicy>);
    }
  } catch {
    // ignore network errors
  }
}

// 外部用語リストを読み込み
async function loadExternalWordList() {
  if (externalWordListLoaded) return;

  try {
    if (__DEV__) {
      console.log("外部用語リストを読み込み中...");
    }
    const wordList = await getWordList();

    // 外部用語リストでポリシーを更新
    activePolicy = {
      ...activePolicy,
      sexualTermsJa: [
        ...new Set([...activePolicy.sexualTermsJa, ...wordList.sexualTermsJa]),
      ],
      harassTerms: [
        ...new Set([...activePolicy.harassTerms, ...wordList.harassTerms]),
      ],
      sexualTermsEn: [
        ...new Set([...activePolicy.sexualTermsEn, ...wordList.sexualTermsEn]),
      ],
    };

    externalWordListLoaded = true;
    if (__DEV__) {
      console.log(
        `外部用語リスト読み込み完了: 性的用語 ${wordList.sexualTermsJa.length}件, 攻撃的用語 ${wordList.harassTerms.length}件`,
      );
    }
  } catch (error) {
    console.warn("外部用語リスト読み込みエラー:", error);
    externalWordListLoaded = true; // エラーでもフラグを立てて再試行を防ぐ
  }
}

// Kick a remote fetch once on module load (optional), so policy can be provided via public URL
// Firestore policy will override when available via onSnapshot.
fetchRemotePolicy().catch(() => {});
