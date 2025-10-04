Abstinence Challenge App

開発環境のセットアップと品質ゲートの手順をまとめます。

必要要件

- Node.js 20
- npm 10 以上
- Git

初期セットアップ

```
npm ci
```

開発コマンド

- npm run start: Expo 開発サーバー起動
- npm run start:tunnel: Expo をトンネル経由で起動（外部ネットワークから検証）
- npm run start:tunnel:auto: LAN IP を自動設定して --tunnel 起動（推奨）
- npm run start:tunnel:proxy: ngrok を使わず localtunnel 経由で起動（回避策）
- npm run typecheck: 型チェック（出力なし）
- npm run lint: ESLint 実行
- npm run lint:fix: 自動修正
- npm run format: Prettier で整形

コミットフック
husky + lint-staged により、コミット時に ESLint/Prettier が実行されます。

ディレクトリ方針（抜粋）

- src/components/: 見た目に特化した Presentational コンポーネント
- src/screens/: 画面コンテナ（状態・ナビゲーションを担当）
- src/hooks/: 再利用可能なロジック（副作用や状態管理）
- src/services/: API/Firestore などの外部 I/O
- src/types/: ドメイン型の定義

環境変数
Firebase のクレデンシャルはコードに直書きしないでください。
.env（未コミット）を使い、expo-constants などから参照します。

CI
GitHub Actions で typecheck と lint を実行します。将来的にテストと EAS Build を追加予定。

今後の改善ロードマップ

- 画面の巨大化解消（Presentational/Hook への分割）
- Firestore サービスのリポジトリ層分離
- Jest + RTL による最小テストの追加
- ドメイン型集約と any 削減

トンネル経由での動作確認（--tunnel）

- 物理端末や外部ネットワークから検証する場合は、Expo のトンネル接続を使います。
- 実行コマンド: `npm run start:tunnel`
- 事前に IP 自動設定も行う場合: `npm run start:tunnel:auto`
- Dev Client を使う場合: `npm run start:dev-client:tunnel`
  - 自動設定版: `npm run start:dev-client:tunnel:auto`

Firebase（本番）接続

- `.env.local` に本番 Firebase の Web 設定（EXPO*PUBLIC_FIREBASE*...）を設定してください。
- エミュレータ関連の設定は不要です。

手順の目安

- `npm run start:tunnel` を実行し、CLI に表示される QR を Expo Go（または Dev Client）で読み取ります。

トラブルシューティング: ngrok tunnel took too long to connect

- 社内 FW/プロキシで ngrok への到達がブロックされると発生します。
- 回避策: ngrok を使わずプロキシトンネルを使う
  - `npm run start:tunnel:proxy`（内部で localtunnel を起動）
  - Dev Client の場合: `npm run start:dev-client:tunnel:proxy`
  - これらは `EXPO_PACKAGER_PROXY_URL` を自動設定し、Expo の生成 URL をトンネル経由に切り替えます。
- 追加チェック: Expo ログイン、社内プロキシ設定、FW で `*.exp.direct`/`*.ngrok.io` が遮断されていないか





