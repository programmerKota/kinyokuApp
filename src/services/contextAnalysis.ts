// 文脈を考慮した不適切コンテンツ検出

// 不適切なコンテキストのパターン
const INAPPROPRIATE_CONTEXTS = [
  // 性的な文脈
  {
    category: "sexual_context",
    patterns: [
      ["好き", "エッチ"],
      ["したい", "裸"],
      ["見たい", "胸"],
      ["触りたい", "体"],
      ["一緒に", "ベッド"],
      ["会って", "ホテル"],
      ["今度", "二人きり"],
      ["写真", "送って"],
      ["動画", "撮って"],
      ["脱いで", "ください"],
    ],
    severity: 4,
  },

  // 出会い系の文脈
  {
    category: "dating_context",
    patterns: [
      ["会いませんか", "今度"],
      ["お金", "あげる"],
      ["援助", "します"],
      ["パパ", "探してる"],
      ["お小遣い", "あげる"],
      ["デート", "しませんか"],
      ["今から", "会える"],
      ["すぐ", "会いたい"],
      ["連絡先", "教えて"],
    ],
    severity: 5,
  },

  // ハラスメントの文脈
  {
    category: "harassment_context",
    patterns: [
      ["死ね", "ばか"],
      ["消えろ", "うざい"],
      ["きもい", "近寄るな"],
      ["ブス", "だから"],
      ["バカ", "すぎる"],
      ["クズ", "野郎"],
      ["殺したい", "むかつく"],
      ["うざい", "死んで"],
    ],
    severity: 4,
  },

  // 薬物・違法行為の文脈
  {
    category: "illegal_context",
    patterns: [
      ["薬", "売ってる"],
      ["大麻", "欲しい"],
      ["クスリ", "買いたい"],
      ["違法", "ダウンロード"],
      ["海賊版", "無料"],
      ["コピー", "配布"],
      ["偽造", "できる"],
      ["詐欺", "方法"],
      ["金", "稼げる"],
    ],
    severity: 5,
  },
];

// 単語間の距離を計算
function calculateWordDistance(
  text: string,
  word1: string,
  word2: string,
): number {
  const normalizedText = text.toLowerCase();
  const index1 = normalizedText.indexOf(word1.toLowerCase());
  const index2 = normalizedText.indexOf(word2.toLowerCase());

  if (index1 === -1 || index2 === -1) return Infinity;

  return Math.abs(index1 - index2);
}

// 文脈パターンをチェック
function checkContextPattern(text: string, pattern: string[]): boolean {
  if (pattern.length < 2) return false;

  const [word1, word2] = pattern;
  const distance = calculateWordDistance(text, word1, word2);

  // 単語間の距離が50文字以内の場合、関連性があると判断
  if (distance < 50) return true;

  // より厳格なチェック：文脈キーワードの組み合わせ
  const contextKeywords = [
    // 性的な文脈
    ["好き", "エッチ", "したい", "裸", "見たい", "胸", "触りたい", "体"],
    ["一緒に", "ベッド", "会って", "ホテル", "今度", "二人きり"],
    ["写真", "送って", "動画", "撮って", "脱いで", "ください"],

    // 出会い系の文脈
    ["会いませんか", "今度", "お金", "あげる", "援助", "します"],
    ["パパ", "探してる", "お小遣い", "あげる", "デート", "しませんか"],
    ["今から", "会える", "すぐ", "会いたい", "連絡先", "教えて"],

    // ハラスメントの文脈
    ["死ね", "ばか", "消えろ", "うざい", "きもい", "近寄るな"],
    ["ブス", "だから", "バカ", "すぎる", "クズ", "野郎"],
    ["殺したい", "むかつく", "うざい", "死んで"],

    // 薬物・違法行為の文脈
    ["薬", "売ってる", "大麻", "欲しい", "クスリ", "買いたい"],
    ["違法", "ダウンロード", "海賊版", "無料", "コピー", "配布"],
    ["偽造", "できる", "詐欺", "方法", "金", "稼げる"],
  ];

  // 複数のキーワードが含まれているかチェック
  for (const keywords of contextKeywords) {
    const foundKeywords = keywords.filter((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (foundKeywords.length >= 2) {
      return true;
    }
  }

  return false;
}

// 文脈分析
export function analyzeContext(text: string): {
  inappropriate: boolean;
  categories: string[];
  maxSeverity: number;
  matchedPatterns: string[][];
} {
  const matchedPatterns: string[][] = [];
  const categories: string[] = [];
  let maxSeverity = 0;

  for (const context of INAPPROPRIATE_CONTEXTS) {
    for (const pattern of context.patterns) {
      if (checkContextPattern(text, pattern)) {
        matchedPatterns.push(pattern);
        if (!categories.includes(context.category)) {
          categories.push(context.category);
        }
        maxSeverity = Math.max(maxSeverity, context.severity);
      }
    }
  }

  return {
    inappropriate: matchedPatterns.length > 0,
    categories,
    maxSeverity,
    matchedPatterns,
  };
}

// 連続投稿パターンの検出
export function detectSpamPattern(texts: string[]): {
  isSpam: boolean;
  reason: string;
  severity: number;
} {
  if (texts.length < 2) {
    return { isSpam: false, reason: "", severity: 0 };
  }

  // 同じ内容の連続投稿
  const uniqueTexts = new Set(texts.map((t) => t.trim().toLowerCase()));
  if (uniqueTexts.size === 1) {
    return { isSpam: true, reason: "IDENTICAL_POSTS", severity: 3 };
  }

  // 類似した内容の連続投稿
  const similarities = [];
  for (let i = 0; i < texts.length - 1; i++) {
    const similarity = calculateTextSimilarity(texts[i], texts[i + 1]);
    similarities.push(similarity);
  }

  const avgSimilarity =
    similarities.reduce((a, b) => a + b, 0) / similarities.length;
  if (avgSimilarity > 0.8) {
    return { isSpam: true, reason: "SIMILAR_POSTS", severity: 2 };
  }

  // 短時間での大量投稿
  if (texts.length > 5) {
    return { isSpam: true, reason: "RAPID_POSTS", severity: 3 };
  }

  return { isSpam: false, reason: "", severity: 0 };
}

// テキストの類似度を計算
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// 感情分析（簡易版）
export function analyzeSentiment(text: string): {
  sentiment: "positive" | "neutral" | "negative" | "aggressive";
  score: number;
} {
  const positiveWords = [
    "好き",
    "嬉しい",
    "楽しい",
    "素晴らしい",
    "ありがとう",
    "感謝",
    "幸せ",
  ];
  const negativeWords = [
    "嫌い",
    "悲しい",
    "つらい",
    "苦しい",
    "辛い",
    "最悪",
    "嫌だ",
  ];
  const aggressiveWords = [
    "死ね",
    "きえろ",
    "うざい",
    "むかつく",
    "きもい",
    "バカ",
    "アホ",
  ];

  let positiveCount = 0;
  let negativeCount = 0;
  let aggressiveCount = 0;

  const lowerText = text.toLowerCase();

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) negativeCount++;
  });

  aggressiveWords.forEach((word) => {
    if (lowerText.includes(word)) aggressiveCount++;
  });

  if (aggressiveCount > 0) {
    return { sentiment: "aggressive", score: aggressiveCount };
  } else if (negativeCount > positiveCount) {
    return { sentiment: "negative", score: negativeCount - positiveCount };
  } else if (positiveCount > negativeCount) {
    return { sentiment: "positive", score: positiveCount - negativeCount };
  } else {
    return { sentiment: "neutral", score: 0 };
  }
}
