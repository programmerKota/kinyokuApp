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


