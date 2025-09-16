// テキストモデレーション（外部ポリシー参照）
import { getModerationPolicy } from "./moderationPolicy";
import { getWordList } from "./wordListService";

export type ModerationDecision = {
  status: "clean" | "flagged" | "blocked" | "pending";
  reasons: string[];
  severity: number; // 1 (軽微) - 5 (重大)
  checkedBy: "auto";
};

const URL_REGEX = /(https?:\/\/|www\.|\.com\b|\.net\b|\.jp\b)/i;
const CONTACT_REGEX = /(\b\d{10,11}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

export async function moderateText(text: string): Promise<ModerationDecision> {
  const policy = getModerationPolicy();
  const reasons: string[] = [];
  let severity = 0;
  const norm = normalize(text);

  // デバッグ用ログ（開発環境のみ）
  if (__DEV__) {
    console.log("監視チェック開始:", {
      text,
      norm,
      policy: policy.sexualTermsJa,
    });
  }

  // 許可語（誤検知緩和）
  if (policy.allowTerms?.length) {
    for (const allow of policy.allowTerms) {
      if (includesFuzzy(norm, allow, policy.fuzzyGapChars)) {
        return { status: "clean", reasons: [], severity: 0, checkedBy: "auto" };
      }
    }
  }

  // 外部用語リストも含めてチェック
  try {
    const externalWordList = await getWordList();
    const allSexualTerms = [
      ...(policy.sexualTermsJa || []),
      ...(externalWordList.sexualTermsJa || []),
      ...(externalWordList.sexualWithMask || []),
      ...(externalWordList.sexualWithBopo || []),
    ];
    const allHarassTerms = [
      ...(policy.harassTerms || []),
      ...(externalWordList.harassTerms || []),
    ];
    const sexualAll = [...allSexualTerms, ...(policy.sexualTermsEn || [])];

    // ハラスメント用語チェック
    for (const w of allHarassTerms) {
      if (includesFuzzy(norm, w, policy.fuzzyGapChars)) {
        reasons.push(`NG:${w}`);
        severity = Math.max(severity, 3);
      }
    }

    // 性的用語チェック
    for (const w of sexualAll) {
      if (includesFuzzy(norm, w, policy.fuzzyGapChars)) {
        reasons.push(`NG:${w}`);
        severity = Math.max(severity, 4);
        if (__DEV__) {
          console.log("性的用語検出:", { word: w, norm, matched: true });
        }
      }
    }
  } catch (error) {
    console.warn("外部用語リスト取得エラー、ローカルポリシーのみ使用:", error);

    // フォールバック：外部リソースが利用できない場合は空のリストで処理
    // 外部リソースが利用できない場合は監視をスキップ
    console.warn("外部用語リストが利用できないため、監視をスキップします");
  }

  if (URL_REGEX.test(text)) {
    reasons.push("URL");
    severity = Math.max(severity, 2);
  }
  if (CONTACT_REGEX.test(text)) {
    reasons.push("CONTACT");
    severity = Math.max(severity, 3);
  }

  // 連投/スパム（簡易）
  const uniqueChars = new Set(norm.replace(/\s+/g, "")).size;
  if (norm.length > 120 && uniqueChars < 5) {
    reasons.push("SPAM_LOW_VARIETY");
    severity = Math.max(severity, 2);
  }

  if (reasons.length === 0) {
    return { status: "clean", reasons: [], severity: 0, checkedBy: "auto" };
  }

  const status =
    severity >= (policy.blockThreshold ?? 4)
      ? "blocked"
      : severity >= (policy.flagThreshold ?? 3)
      ? "flagged"
      : "clean";

  if (__DEV__) {
    console.log("監視結果:", {
      status,
      reasons,
      severity,
      blockThreshold: policy.blockThreshold,
    });
  }
  return { status, reasons, severity, checkedBy: "auto" };
}

function normalize(s: string): string {
  return s.trim().toLowerCase().normalize("NFKC");
}

// 文字間に空白/記号が挟まってもヒットさせる簡易ファジー一致
function includesFuzzy(text: string, word: string, gapChars?: string): boolean {
  if (!word) return false;
  const esc = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const chars = word.split("").map(esc);
  const gapClass = gapChars || "";
  const gap = gapClass ? `[${gapClass}]*` : "";
  const pattern = chars.join(gap);
  try {
    const re = new RegExp(pattern, "i");
    return re.test(text);
  } catch {
    return text.includes(word);
  }
}
