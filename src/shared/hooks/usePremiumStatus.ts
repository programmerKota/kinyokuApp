import { useMemo } from "react";

/**
 * 暫定のプレミアム判定フック。
 * 将来的にサーバー／ストア決済の状態に接続する。
 */
export const usePremiumStatus = () => {
  // TODO: Supabaseのプロフィールや課金検証結果と連携する
  const isPremium = useMemo(() => false, []);

  return {
    isPremium,
  };
};

export default usePremiumStatus;
