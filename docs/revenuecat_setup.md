# RevenueCat セットアップ（iOS）

このアプリで課金（ペナルティ支払い）を有効化するための手順です。作業は iOS のみを対象にしています。

## 1) ストアのSKUを用意（App Store Connect）
- マイApp → 機能 → App内課金 → 作成
- 種類: 消耗型（Consumable）
- 製品ID: `penalty_10`, `penalty_100`, `penalty_1000`, `penalty_10000`
- 価格: JPY の希望金額に最も近い価格帯
- Cleared for Sale: ON
- 保存（反映に数分〜最大60分）

## 2) RevenueCat と接続
- App Settings → Integrations → App Store Connect
  - Issuer ID / Key ID / Private Key（.p8）を登録して Test connection = Success
- Product catalog → Products
  - Import from App Store が使えなくても、New product で手動追加可
  - Identifier: `penalty_*`、Type: Consumable

## 3) Offering を作成
- Offerings → New offering → identifier: `penalty`
- `Add package` で下記を作成
  - `jpy_10` → `penalty_10`
  - `jpy_100` → `penalty_100`
  - `jpy_1000` → `penalty_1000`
  - `jpy_10000` → `penalty_10000`
- `Set as current` に設定

## 4) アプリの環境変数
`app.json:expo.extra` に設定

```
EXPO_PUBLIC_RC_IOS_PUBLIC_API_KEY=<RC iOS Public SDK Key>
# Offering名を変更した場合のみ
EXPO_PUBLIC_RC_PENALTY_OFFERING=penalty
# 実課金テストを避ける場合は true（モック）。TestFlightで検証なら false
EXPO_PUBLIC_PAYMENTS_DEV_MODE=false
```

## 5) Webhook（任意）
- URL: `https://<project-ref>.functions.supabase.co/revenuecat-webhook`
- Signing secret を設定（Supabase 側の `REVENUECAT_WEBHOOK_SECRET` と同じ）
- Supabase の関数設定で Verify JWT を OFF、`SUPABASE_SERVICE_ROLE_KEY` を設定

## 6) TestFlight で検証
- `npm run build:ios:preview` → `eas submit -p ios --latest`
- App Store Connect → TestFlight から内部テストを有効化
- 端末にインストール → アプリで支払いフローを実行
- 期待: `payments`/`payment_logs` に反映、レシートはWebhookで追記

メモ: ペイウォールは実価格（RevenueCatの `product.price`）を表示します。ターゲット額と販売価格に差がある場合でもユーザーに正しい金額が見えます。

