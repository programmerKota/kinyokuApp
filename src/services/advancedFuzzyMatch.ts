// 高度なあいまい検索機能

// 文字の類似性マップ
const SIMILAR_CHARS: Record<string, string[]> = {
  あ: ["ア", "a", "ａ", "@"],
  い: ["イ", "i", "ｉ", "1", "！"],
  う: ["ウ", "u", "ｕ"],
  え: ["エ", "e", "ｅ"],
  お: ["オ", "o", "ｏ", "0", "０"],
  か: ["カ", "k", "ｋ"],
  き: ["キ", "ki", "ｋｉ"],
  く: ["ク", "ku", "ｋｕ"],
  け: ["ケ", "ke", "ｋｅ"],
  こ: ["コ", "ko", "ｋｏ"],
  さ: ["サ", "s", "ｓ"],
  し: ["シ", "si", "shi", "ｓｉ", "ｓｈｉ"],
  す: ["ス", "su", "ｓｕ"],
  せ: ["セ", "se", "ｓｅ"],
  そ: ["ソ", "so", "ｓｏ"],
  た: ["タ", "t", "ｔ"],
  ち: ["チ", "ti", "chi", "ｔｉ", "ｃｈｉ"],
  つ: ["ツ", "tu", "tsu", "ｔｕ", "ｔｓｕ"],
  て: ["テ", "te", "ｔｅ"],
  と: ["ト", "to", "ｔｏ"],
  な: ["ナ", "n", "ｎ"],
  に: ["ニ", "ni", "ｎｉ"],
  ぬ: ["ヌ", "nu", "ｎｕ"],
  ね: ["ネ", "ne", "ｎｅ"],
  の: ["ノ", "no", "ｎｏ"],
  は: ["ハ", "h", "ｈ"],
  ひ: ["ヒ", "hi", "ｈｉ"],
  ふ: ["フ", "fu", "hu", "ｆｕ", "ｈｕ"],
  へ: ["ヘ", "he", "ｈｅ"],
  ほ: ["ホ", "ho", "ｈｏ"],
  ま: ["マ", "m", "ｍ"],
  み: ["ミ", "mi", "ｍｉ"],
  む: ["ム", "mu", "ｍｕ"],
  め: ["メ", "me", "ｍｅ"],
  も: ["モ", "mo", "ｍｏ"],
  や: ["ヤ", "y", "ｙ"],
  ゆ: ["ユ", "yu", "ｙｕ"],
  よ: ["ヨ", "yo", "ｙｏ"],
  ら: ["ラ", "r", "ｒ"],
  り: ["リ", "ri", "ｒｉ"],
  る: ["ル", "ru", "ｒｕ"],
  れ: ["レ", "re", "ｒｅ"],
  ろ: ["ロ", "ro", "ｒｏ"],
  わ: ["ワ", "w", "ｗ"],
  ん: ["ン", "n", "ｎ"],
};

// 文字を正規化（類似文字を統一）
function normalizeCharacter(char: string): string {
  const lowerChar = char.toLowerCase();

  // 全角英数字を半角に変換
  if (char >= "ａ" && char <= "ｚ") {
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
  }
  if (char >= "Ａ" && char <= "Ｚ") {
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0).toLowerCase();
  }
  if (char >= "０" && char <= "９") {
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
  }

  // カタカナをひらがなに変換
  if (char >= "ァ" && char <= "ヶ") {
    return String.fromCharCode(char.charCodeAt(0) - 0x60);
  }

  return lowerChar;
}

// テキストを正規化
function normalizeText(text: string): string {
  return text
    .split("")
    .map(normalizeCharacter)
    .join("")
    .replace(/[\s\-_\.・〜～]/g, "") // 区切り文字を削除
    .trim();
}

// 高度なあいまい検索
export function advancedFuzzyMatch(
  text: string,
  pattern: string,
  threshold: number = 0.8,
): boolean {
  const normalizedText = normalizeText(text);
  const normalizedPattern = normalizeText(pattern);

  // 完全一致チェック
  if (normalizedText.includes(normalizedPattern)) {
    return true;
  }

  // 文字の置換を考慮したマッチング
  return fuzzyMatchWithSimilarChars(
    normalizedText,
    normalizedPattern,
    threshold,
  );
}

// 類似文字を考慮したあいまい検索
function fuzzyMatchWithSimilarChars(
  text: string,
  pattern: string,
  threshold: number,
): boolean {
  const textChars = text.split("");
  const patternChars = pattern.split("");

  // パターンの各文字について、テキスト内で類似文字を探す
  let matchCount = 0;
  let textIndex = 0;

  for (const patternChar of patternChars) {
    let found = false;

    // 現在位置から類似文字を探す
    for (let i = textIndex; i < textChars.length; i++) {
      if (isCharacterSimilar(textChars[i], patternChar)) {
        matchCount++;
        textIndex = i + 1;
        found = true;
        break;
      }
    }

    if (!found) {
      // 見つからない場合、少し先まで探す（ギャップを許容）
      for (
        let i = textIndex;
        i < Math.min(textIndex + 3, textChars.length);
        i++
      ) {
        if (isCharacterSimilar(textChars[i], patternChar)) {
          matchCount++;
          textIndex = i + 1;
          found = true;
          break;
        }
      }
    }
  }

  const similarity = matchCount / patternChars.length;
  return similarity >= threshold;
}

// 文字が類似しているかチェック
function isCharacterSimilar(char1: string, char2: string): boolean {
  if (char1 === char2) return true;

  // 類似文字マップをチェック
  for (const [base, similar] of Object.entries(SIMILAR_CHARS)) {
    if (
      (base === char1 || similar.includes(char1)) &&
      (base === char2 || similar.includes(char2))
    ) {
      return true;
    }
  }

  return false;
}

// パターンのバリエーションを生成
export function generatePatternVariations(pattern: string): string[] {
  const variations = new Set<string>();
  variations.add(pattern);

  // 基本的な変形
  variations.add(normalizeText(pattern));

  // スペースを挟んだ変形
  const chars = pattern.split("");
  if (chars.length > 1) {
    variations.add(chars.join(" "));
    variations.add(chars.join("　")); // 全角スペース
    variations.add(chars.join("-"));
    variations.add(chars.join("_"));
    variations.add(chars.join("."));
    variations.add(chars.join("・"));
  }

  return Array.from(variations);
}

// 複数のパターンでマッチング
export function multiPatternFuzzyMatch(
  text: string,
  patterns: string[],
  threshold: number = 0.8,
): boolean {
  for (const pattern of patterns) {
    const variations = generatePatternVariations(pattern);
    for (const variation of variations) {
      if (advancedFuzzyMatch(text, variation, threshold)) {
        return true;
      }
    }
  }
  return false;
}

