// 決済サービスの薄いラッパー。実ストア連携は後続で react-native-iap / RevenueCat 等に差し替え。

export type PurchaseResult = 'success' | 'cancel' | 'failed';

class PaymentServiceImpl {
  // アプリ内課金でペナルティ金額を決済する
  async purchasePenaltyYen(amountYen: number): Promise<PurchaseResult> {
    if (!Number.isFinite(amountYen) || amountYen <= 0) return 'cancel';
    // TODO: 実装時に各ストアのプロダクトIDへマップし、決済処理を実行
    // ここでは開発中スタブとして即時成功扱い
    return 'success';
  }
}

export const PaymentService = new PaymentServiceImpl();


