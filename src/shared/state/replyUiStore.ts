let inputBarHeight = 140; // 初期推定値（空のときの最小高）
const subs = new Set<() => void>();

const emit = () =>
  subs.forEach((cb) => {
    try {
      cb();
    } catch {}
  });

export const ReplyUiStore = {
  getInputBarHeight(): number {
    return inputBarHeight;
  },
  setInputBarHeight(h: number) {
    if (!Number.isFinite(h) || h <= 0) return;
    if (Math.abs(h - inputBarHeight) < 0.5) return; // ignore tiny fluctuations
    inputBarHeight = h;
    emit();
  },
  subscribe(cb: () => void): () => void {
    subs.add(cb);
    return () => subs.delete(cb);
  },
};

export default ReplyUiStore;
