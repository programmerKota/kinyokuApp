// ストアの商品ID（仮）。App Store / Google Play で作成後に置き換えてください。

export const PENALTY_SKUS = {
  JPY_10: 'penalty_10',
  JPY_100: 'penalty_100',
  JPY_1000: 'penalty_1000',
  JPY_10000: 'penalty_10000',
} as const;

export const mapAmountToSku = (amountYen: number): string | null => {
  switch (amountYen) {
    case 10:
      return PENALTY_SKUS.JPY_10;
    case 100:
      return PENALTY_SKUS.JPY_100;
    case 1000:
      return PENALTY_SKUS.JPY_1000;
    case 10000:
      return PENALTY_SKUS.JPY_10000;
    default:
      return null;
  }
};


