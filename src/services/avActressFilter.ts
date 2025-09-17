import { getAvActressNames } from "./avActressDbService";
import { AV_ACTRESS_NAMES_LOCAL } from "../data/avActressNamesLocal";

// シンプルなメモリキャッシュでFirestoreへのアクセスを抑制
let cachedNames: string[] | null = null;
let lastFetched = 0;
const TTL_MS = 12 * 60 * 60 * 1000; // 12時間

async function getActressNames(): Promise<string[]> {
  const now = Date.now();
  if (cachedNames && now - lastFetched < TTL_MS) return cachedNames;
  let names: string[] = [];
  try {
    names = await getAvActressNames();
  } catch {
    names = [];
  }
  // Fallback/merge with bundled local list
  const merged = Array.from(new Set([...(names || []), ...AV_ACTRESS_NAMES_LOCAL]));
  cachedNames = merged;
  lastFetched = now;
  return cachedNames;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ァ-ヴ]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60),
    )
    .replace(/[ａ-ｚＡ-Ｚ０-９]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0xfee0),
    )
    .replace(/\s+/g, "")
    .trim();
}

export async function containsAvActressName(text: string): Promise<boolean> {
  const normalizedText = normalizeText(text);

  const actressNames = await getActressNames();
  return actressNames.some((name) => {
    const normalizedName = normalizeText(name);
    // 誤検知抑止: 3文字未満の短い名前はスキップ
    if (normalizedName.length < 3) return false;
    return normalizedText.includes(normalizedName);
  });
}

export function containsAvActressNameSync(text: string): boolean {
  return false;
}

export async function containsAvActressNameStrict(
  text: string,
): Promise<boolean> {
  const normalizedText = normalizeText(text);

  if (await containsAvActressName(text)) {
    return true;
  }

  const actressNames = await getActressNames();
  const textWithoutSpaces = normalizedText.replace(/[\s\-_\.・]/g, "");

  return actressNames.some((name) => {
    const normalizedName = normalizeText(name);
    if (normalizedName.length < 3) return false;
    return textWithoutSpaces.includes(normalizedName);
  });
}

export function containsAvActressNameStrictSync(text: string): boolean {
  if (containsAvActressNameSync(text)) {
    return true;
  }
  return false;
}

export async function testAvActressFilter(text: string): Promise<{
  isAvActressName: boolean;
  result: boolean;
  matchedAvActressNames: string[];
  totalActressCount: number;
  cacheStatus: "static";
}> {
  const normalizedText = normalizeText(text);

  const actressNames = await getActressNames();
  const totalActressCount = actressNames.length;
  const matchedAvActressNames = actressNames.filter((name) => {
    const normalizedName = normalizeText(name);
    return normalizedText.includes(normalizedName);
  });

  const isAvActressName = matchedAvActressNames.length > 0;
  const result = isAvActressName;

  return {
    isAvActressName,
    result,
    matchedAvActressNames,
    totalActressCount,
    cacheStatus: "static",
  };
}

export function testAvActressFilterSync(text: string): {
  isAvActressName: boolean;
  result: boolean;
  matchedAvActressNames: string[];
} {
  const matchedAvActressNames: string[] = [];
  const isAvActressName = false;
  const result = false;

  return {
    isAvActressName,
    result,
    matchedAvActressNames,
  };
}

export function clearActressCache(): void {
  cachedNames = null;
  lastFetched = 0;
}

export function getCacheStatus(): {
  hasCache: boolean;
  lastFetch: number;
  age: number;
  isExpired: boolean;
} {
  const now = Date.now();
  const age = lastFetched ? now - lastFetched : 0;
  return {
    hasCache: Array.isArray(cachedNames) && cachedNames.length > 0,
    lastFetch: lastFetched,
    age,
    isExpired: !lastFetched || age > TTL_MS,
  };
}
