// シンプルで誤検知しにくいテキストモデレーション
// 依存や外部ネットワークを使わず、最小限のルールで判定します。

import { containsAvActressNameStrict } from './avActressFilter';

export type ModerationDecision = {
  status: 'clean' | 'flagged' | 'blocked' | 'pending';
  reasons: string[];
  severity: number; // 1 (軽微) - 5 (重大)
  checkedBy: 'auto';
};

// 軽い正規化のみ（過剰な正規化は誤検知の温床になる）
const norm = (s: string) => s.normalize('NFKC').trim();

// 完全一致・素朴な部分一致のみで判定する語彙
// ここに含まれない一般語は誤検知しない方針
const BLOCK_TERMS_JA = [
  '自殺', '殺す', '死ね', '児童ポルノ', '違法薬物', 'テロ', '爆弾',
];
const FLAG_TERMS_JA = [
  '出会い系', '援助交際', 'パパ活', '裸', 'セックス', 'エロ', 'アダルト', '風俗',
];
const BLOCK_TERMS_EN = ['suicide', 'kill', 'terror', 'bomb'];
const FLAG_TERMS_EN = ['sex', 'porn', 'adult'];

const URL_RE = /(https?:\/\/|www\.)/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /\b\d{10,11}\b/; // 10-11桁の連番

export async function moderateText(text: string): Promise<ModerationDecision> {
  const t = norm(text);
  if (!t) return { status: 'clean', reasons: [], severity: 0, checkedBy: 'auto' };

  const lower = t.toLowerCase();
  const reasons: string[] = [];
  let severity = 0;

  // 露骨/危険な内容は即ブロック
  if (
    BLOCK_TERMS_JA.some((w) => t.includes(w)) ||
    BLOCK_TERMS_EN.some((w) => lower.includes(w))
  ) {
    reasons.push('BLOCK_TERM');
    severity = 5;
    return { status: 'blocked', reasons, severity, checkedBy: 'auto' };
  }

  // 軽度の成人向け・出会い誘引などはフラグ
  if (
    FLAG_TERMS_JA.some((w) => t.includes(w)) ||
    FLAG_TERMS_EN.some((w) => lower.includes(w))
  ) {
    reasons.push('SENSITIVE_TERM');
    severity = Math.max(severity, 3);
  }

  // 連絡先・URL の露出はフラグ（コミュニティ保護）
  if (URL_RE.test(t)) {
    reasons.push('URL');
    severity = Math.max(severity, 2);
  }
  if (EMAIL_RE.test(t) || PHONE_RE.test(t)) {
    reasons.push('CONTACT');
    severity = Math.max(severity, 3);
  }

  // AV女優名の検知（軽量・キャッシュあり）。短文・非日本語はスキップ
  const looksJapanese = /[ぁ-んァ-ン一-龥]/.test(t);
  if (looksJapanese && t.length >= 3) {
    try {
      const hit = await containsAvActressNameStrict(t);
      if (hit) {
        reasons.push('AV_ACTRESS');
        severity = Math.max(severity, 3); // デフォルトはフラグ留め
      }
    } catch {
      // 失敗しても無視（送信を妨げない）
    }
  }

  // 一般の文章はクリーン
  if (reasons.length === 0) {
    return { status: 'clean', reasons: [], severity: 0, checkedBy: 'auto' };
  }

  // ここまでにブロック要因が無ければフラグ止まり
  return { status: 'flagged', reasons, severity, checkedBy: 'auto' };
}
