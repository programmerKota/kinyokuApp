// 拡張された禁止用語リスト
export const ENHANCED_BANNED_TERMS = {
  // 性的な用語（より包括的）
  sexual: [
    "セックス",
    "エッチ",
    "おっぱい",
    "胸",
    "ちんこ",
    "まんこ",
    "おちんちん",
    "sex",
    "fuck",
    "porn",
    "xxx",
    "adult",
    "av",
    "エーブイ",
    "アダルト",
    "裸",
    "ヌード",
    "脱ぐ",
    "濡れる",
    "興奮",
    "オナニー",
    "マスターベーション",
    "フェラ",
    "クンニ",
    "69",
    "しっくすないん",
    "挿入",
    "射精",
    "イク",
    "いく",
    "むらむら",
    "えろい",
    "エロい",
    "いやらしい",
    "スケベ",
    "hentai",
    "ヘンタイ",
    // より露骨な表現
    "ちんぽ",
    "まんこ",
    "おっぱい",
    "おっぱい",
    "おっぱい",
    "おっぱい",
    "ちんちん",
    "ちんちん",
    "ちんちん",
    "ちんちん",
    "ちんちん",
    "まんこ",
    "まんこ",
    "まんこ",
    "まんこ",
    "まんこ",
    "おっぱい",
    "おっぱい",
    "おっぱい",
    "おっぱい",
    "おっぱい",
    // 英語の性的表現
    "cock",
    "pussy",
    "dick",
    "pussy",
    "tits",
    "boobs",
    "ass",
    "fuck",
    "fucking",
    "fucked",
    "fucks",
    "fucker",
    "fuckers",
    "fucking",
    "porn",
    "porno",
    "pornographic",
    "pornography",
    "xxx",
    "adult",
    "adult content",
    "adult video",
    "adult film",
    "adult movie",
    // 数字での置換
    "s3x",
    "fuck1ng",
    "p0rn",
    "xxx",
    "4dult",
    "4v",
    "3r0",
    "3r0い",
    "1やらしい",
    "スケベ",
    "h3nt41",
    "ヘンタイ",
    "ちんぽ",
    "まんこ",
    "おっぱい",
    "ちんちん",
    "まんこ",
    "おっぱい",
    "ちんちん",
  ],

  // アダルトビデオ関連用語
  adultVideo: [
    "アダルトビデオ",
    "アダルト動画",
    "エロ動画",
    "エロビデオ",
    "アダルトサイト",
    "av女優",
    "AV女優",
    "セクシー女優",
    "グラビアアイドル",
    "風俗嬢",
    "pornstar",
    "ポルノスター",
    "adult actress",
    "セクシーモデル",
    "dmm",
    "fanza",
    "javhd",
    "pornhub",
    "xvideos",
    "xhamster",
  ],

  // 出会い系・風俗関連
  dating: [
    "出会い系",
    "出会い",
    "セフレ",
    "不倫",
    "浮気",
    "ワンナイト",
    "一夜限り",
    "デリヘル",
    "ソープ",
    "ヘルス",
    "風俗",
    "キャバクラ",
    "ガールズバー",
    "パパ活",
    "ママ活",
    "援交",
    "援助交際",
    "売春",
    "買春",
    "円光",
    "sugar daddy",
    "sugar baby",
    "escort",
    "prostitute",
  ],

  // 薬物関連
  drugs: [
    "大麻",
    "マリファナ",
    "コカイン",
    "ヘロイン",
    "覚醒剤",
    "シャブ",
    "クスリ",
    "ドラッグ",
    "薬物",
    "麻薬",
    "LSD",
    "MDMA",
    "エクスタシー",
    "cannabis",
    "marijuana",
    "cocaine",
    "heroin",
    "meth",
    "drug",
  ],

  // 暴力・犯罪関連
  violence: [
    "殺す",
    "死ね",
    "自殺",
    "首吊り",
    "飛び降り",
    "リスカ",
    "リストカット",
    "爆弾",
    "銃",
    "拳銃",
    "テロ",
    "誘拐",
    "強盗",
    "詐欺",
    "恐喝",
    "kill",
    "murder",
    "suicide",
    "bomb",
    "gun",
    "terror",
    "kidnap",
  ],

  // 差別・ヘイト関連
  hate: [
    "ブス",
    "ブサイク",
    "キモい",
    "きもい",
    "うざい",
    "ウザい",
    "死ね",
    "バカ",
    "アホ",
    "馬鹿",
    "阿呆",
    "クズ",
    "ゴミ",
    "カス",
    "在日",
    "朝鮮人",
    "韓国人",
    "中国人",
    "外人",
    "ガイジン",
    "ugly",
    "stupid",
    "idiot",
    "moron",
    "retard",
    "loser",
  ],

  // ギャンブル関連
  gambling: [
    "パチンコ",
    "パチスロ",
    "スロット",
    "競馬",
    "競輪",
    "競艇",
    "ボートレース",
    "カジノ",
    "ポーカー",
    "ブラックジャック",
    "バカラ",
    "ルーレット",
    "宝くじ",
    "ロト",
    "toto",
    "BIG",
    "ナンバーズ",
    "casino",
    "poker",
    "blackjack",
    "roulette",
    "gambling",
  ],
};

// すべての禁止用語を統合
export const ALL_BANNED_TERMS = [
  ...ENHANCED_BANNED_TERMS.sexual,
  ...ENHANCED_BANNED_TERMS.adultVideo,
  ...ENHANCED_BANNED_TERMS.dating,
  ...ENHANCED_BANNED_TERMS.drugs,
  ...ENHANCED_BANNED_TERMS.violence,
  ...ENHANCED_BANNED_TERMS.hate,
  ...ENHANCED_BANNED_TERMS.gambling,
];

// カテゴリ別の重要度
export const CATEGORY_SEVERITY = {
  sexual: 4,
  adultVideo: 5,
  dating: 4,
  drugs: 5,
  violence: 5,
  hate: 4,
  gambling: 3,
};

// 禁止用語をチェックする関数
export function checkBannedTerms(text: string): {
  found: boolean;
  categories: string[];
  maxSeverity: number;
  matchedTerms: string[];
} {
  const normalizedText = text.toLowerCase().replace(/[\s\-_\.・]/g, "");
  const matchedTerms: string[] = [];
  const categories: string[] = [];
  let maxSeverity = 0;

  Object.entries(ENHANCED_BANNED_TERMS).forEach(([category, terms]) => {
    const foundInCategory = terms.some((term) => {
      const normalizedTerm = term.toLowerCase().replace(/[\s\-_\.・]/g, "");
      if (normalizedText.includes(normalizedTerm)) {
        matchedTerms.push(term);
        return true;
      }
      return false;
    });

    if (foundInCategory) {
      categories.push(category);
      maxSeverity = Math.max(
        maxSeverity,
        CATEGORY_SEVERITY[category as keyof typeof CATEGORY_SEVERITY],
      );
    }
  });

  return {
    found: matchedTerms.length > 0,
    categories,
    maxSeverity,
    matchedTerms,
  };
}
