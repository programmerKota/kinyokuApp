// 外部用語リストサービス
// https://github.com/MosasoM/inappropriate-words-ja を参考

export type WordListData = {
  sexualTermsJa: string[];
  harassTerms: string[];
  sexualTermsEn: string[];
  offensiveTerms: string[];
  sexualWithMask: string[];
  sexualWithBopo: string[];
};

// GitHubのrawファイルから用語リストを取得
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/MosasoM/inappropriate-words-ja/master";

export async function fetchWordListFromGitHub(): Promise<WordListData> {
  try {
    if (__DEV__) {
      console.log("GitHubから用語リストを取得中...");
    }

    // 複数のファイルを並行して取得
    const [sexualData, offensiveData, sexualMaskData, sexualBopoData] =
      await Promise.all([
        fetch(`${GITHUB_RAW_BASE}/Sexual.txt`).then((res) => res.text()),
        fetch(`${GITHUB_RAW_BASE}/Offensive.txt`).then((res) => res.text()),
        fetch(`${GITHUB_RAW_BASE}/Sexual_with_mask.txt`).then((res) =>
          res.text()
        ),
        fetch(`${GITHUB_RAW_BASE}/Sexual_with_bopo.txt`).then((res) =>
          res.text()
        ),
      ]);

    // テキストを配列に変換（改行で分割、空行を除去）
    const sexualTerms = sexualData.split("\n").filter((line) => line.trim());
    const offensiveTerms = offensiveData
      .split("\n")
      .filter((line) => line.trim());
    const sexualWithMask = sexualMaskData
      .split("\n")
      .filter((line) => line.trim());
    const sexualWithBopo = sexualBopoData
      .split("\n")
      .filter((line) => line.trim());

    if (__DEV__) {
      console.log(
        `取得完了: 性的用語 ${sexualTerms.length}件, 攻撃的用語 ${offensiveTerms.length}件`
      );
    }

    return {
      sexualTermsJa: sexualTerms,
      harassTerms: offensiveTerms,
      sexualTermsEn: [], // 英語用語は別途管理
      offensiveTerms: offensiveTerms,
      sexualWithMask: sexualWithMask,
      sexualWithBopo: sexualWithBopo,
    };
  } catch (error) {
    console.warn("GitHub用語リスト取得エラー:", error);
    // フォールバック用のデフォルト用語リスト
    return getDefaultWordList();
  }
}

// デフォルトの用語リスト（フォールバック用）
function getDefaultWordList(): WordListData {
  return {
    sexualTermsJa: [],
    harassTerms: [],
    sexualTermsEn: [],
    offensiveTerms: [],
    sexualWithMask: [],
    sexualWithBopo: [],
  };
}

// 用語リストをキャッシュして管理
let cachedWordList: WordListData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

export async function getWordList(forceRefresh = false): Promise<WordListData> {
  const now = Date.now();

  // キャッシュが有効で、強制更新でない場合はキャッシュを返す
  if (!forceRefresh && cachedWordList && now - lastFetchTime < CACHE_DURATION) {
    return cachedWordList;
  }

  try {
    const wordList = await fetchWordListFromGitHub();
    cachedWordList = wordList;
    lastFetchTime = now;
    return wordList;
  } catch (error) {
    console.error("用語リスト取得に失敗:", error);
    // エラーの場合はキャッシュがあればそれを使用、なければデフォルト
    return cachedWordList || getDefaultWordList();
  }
}

// 特定のカテゴリの用語のみを取得
export async function getWordListByCategory(
  category: keyof WordListData
): Promise<string[]> {
  const wordList = await getWordList();
  return wordList[category] || [];
}

// 用語リストをローカルストレージに保存（オフライン対応）
export async function saveWordListToLocal(
  wordList: WordListData
): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(
        "wordList",
        JSON.stringify({
          data: wordList,
          timestamp: Date.now(),
        })
      );
    }
  } catch (error) {
    console.warn("ローカルストレージ保存エラー:", error);
  }
}

// ローカルストレージから用語リストを読み込み
export async function loadWordListFromLocal(): Promise<WordListData | null> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("wordList");
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        const now = Date.now();

        // 24時間以内のデータのみ有効
        if (now - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    }
  } catch (error) {
    console.warn("ローカルストレージ読み込みエラー:", error);
  }
  return null;
}
