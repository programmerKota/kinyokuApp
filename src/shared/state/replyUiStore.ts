let inputBarHeight = 140; // 初期推定値（空のときの最小高）

export const ReplyUiStore = {
  getInputBarHeight(): number {
    return inputBarHeight;
  },
  setInputBarHeight(h: number) {
    if (!Number.isFinite(h) || h <= 0) return;
    inputBarHeight = h;
  },
};

export default ReplyUiStore;

