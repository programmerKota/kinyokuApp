# Cursor MCP サーバー設定ガイド

このプロジェクトでは、CursorでMCP（Model Context Protocol）サーバーを使用できるように設定されています。

## 設定済みのMCPサーバー

### 1. Supabase MCP Server

- **用途**: データベース操作、認証管理、ストレージ操作
- **プロジェクト**: tssfhgfkelsuslpwschl
- **機能**:
  - データベースクエリ実行
  - ユーザー認証管理
  - ファイルストレージ操作
  - リアルタイム購読

### 2. Playwright MCP Server

- **用途**: ブラウザ自動化とテスト
- **機能**:
  - Webページの自動操作
  - スクリーンショット取得
  - テスト実行
  - ページ要素の操作

### 3. Chrome DevTools MCP Server

- **用途**: Chrome開発者ツール
- **設定**: ヘッドレスモード、1280x900ビューポート
- **機能**:
  - Chromeデバッグ
  - パフォーマンス分析
  - ネットワーク監視
  - コンソールアクセス

### 4. Context7 MCP Server

- **用途**: コンテキスト管理と検索
- **機能**:
  - コンテキスト検索
  - ナレッジ管理
  - データインデックス
  - 検索機能

## 使用方法

### Cursorでの利用

1. Cursorを再起動してください
2. プロジェクトを開くと、MCPサーバーが自動的に利用可能になります
3. チャットで以下のような機能を要求できます：
   - 「データベースからユーザー情報を取得して」
   - 「Webページのスクリーンショットを撮って」
   - 「Chromeでデバッグ情報を確認して」
   - 「関連するコンテキストを検索して」

### 利用可能なコマンド例

- **Supabase**: データベースクエリ、ユーザー管理、ファイル操作
- **Playwright**: ブラウザテスト、スクリーンショット、ページ操作
- **Chrome DevTools**: デバッグ、パフォーマンス分析
- **Context7**: コンテキスト検索、ナレッジ管理

## 設定ファイル

- `.cursor/settings.json`: Cursorの基本設定
- `.cursor/mcp_config.json`: MCPサーバーの詳細設定
- `mcp_settings.json`: プロジェクト固有のMCP設定
- `.cursorrules`: MCPサーバーの説明とルール

## トラブルシューティング

### サーバーが起動しない場合

1. Node.jsが正しくインストールされているか確認
2. 必要なパッケージがインストールされているか確認：
   ```bash
   npm list -g @supabase/mcp-server-supabase @playwright/mcp chrome-devtools-mcp @upstash/context7-mcp
   ```

### 権限エラーが発生する場合

1. 管理者権限でコマンドプロンプトを開く
2. パッケージを再インストール：
   ```bash
   npm install -g @supabase/mcp-server-supabase @playwright/mcp chrome-devtools-mcp @upstash/context7-mcp
   ```

## 注意事項

- Supabaseのアクセストークンは機密情報です。公開リポジトリにはコミットしないでください
- Chrome DevToolsは既存のChromeインストールを使用します
- 各サーバーには起動タイムアウトが設定されています

## サポート

問題が発生した場合は、以下を確認してください：

1. ログファイルの確認
2. ネットワーク接続の確認
3. 必要な権限の確認
4. パッケージのバージョン互換性の確認


