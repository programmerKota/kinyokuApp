import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// エラー監視と自動修正システム
class ErrorMonitor {
  constructor() {
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.fixes = new Map();
    this.setupErrorFixes();
  }

  // 既知のエラーパターンと修正方法を定義
  setupErrorFixes() {
    this.fixes.set("NetworkError", {
      description: "ネットワークエラー",
      fix: "ネットワーク接続を確認し、APIエンドポイントを検証",
      action: "checkNetworkConnection",
    });

    this.fixes.set("TypeError", {
      description: "型エラー",
      fix: "変数の型定義を確認し、適切な型キャストを追加",
      action: "checkTypeDefinitions",
    });

    this.fixes.set("ReferenceError", {
      description: "参照エラー",
      fix: "変数や関数の定義を確認し、適切なスコープで宣言",
      action: "checkVariableDefinitions",
    });

    this.fixes.set("SyntaxError", {
      description: "構文エラー",
      fix: "コードの構文を確認し、括弧やセミコロンを修正",
      action: "checkSyntax",
    });
  }

  async start() {
    console.log("🔍 エラー監視を開始します...");

    this.browser = await chromium.launch({
      headless: false,
      devtools: true,
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
    });

    this.page = await context.newPage();

    // エラーイベントリスナーを設定
    this.setupErrorListeners();

    // アプリケーションにアクセス
    await this.page.goto("http://localhost:8081");
    await this.page.waitForLoadState("networkidle");

    console.log("✅ エラー監視が開始されました");

    // 継続的にエラーを監視
    this.startContinuousMonitoring();
  }

  setupErrorListeners() {
    // コンソールエラーを監視
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        this.handleError("ConsoleError", msg.text());
      }
    });

    // ページエラーを監視
    this.page.on("pageerror", (error) => {
      this.handleError("PageError", error.message);
    });

    // ネットワークエラーを監視
    this.page.on("response", (response) => {
      if (!response.ok()) {
        this.handleError(
          "NetworkError",
          `${response.status()} ${response.url()}`,
        );
      }
    });

    // 未処理のPromise拒否を監視
    this.page.on("unhandledrejection", (error) => {
      this.handleError("UnhandledRejection", error);
    });
  }

  handleError(type, message) {
    const error = {
      type,
      message,
      timestamp: new Date().toISOString(),
      url: this.page.url(),
    };

    this.errors.push(error);
    console.log(`❌ エラー検出 [${type}]:`, message);

    // エラーの修正を試行
    this.attemptFix(error);
  }

  async attemptFix(error) {
    const fixInfo = this.fixes.get(error.type);
    if (!fixInfo) {
      console.log(`⚠️ 未知のエラータイプ: ${error.type}`);
      return;
    }

    console.log(`🔧 修正を試行中: ${fixInfo.description}`);
    console.log(`💡 修正方法: ${fixInfo.fix}`);

    // 修正アクションを実行
    await this.executeFixAction(fixInfo.action, error);
  }

  async executeFixAction(action, error) {
    switch (action) {
      case "checkNetworkConnection":
        await this.checkNetworkConnection();
        break;
      case "checkTypeDefinitions":
        await this.checkTypeDefinitions(error);
        break;
      case "checkVariableDefinitions":
        await this.checkVariableDefinitions(error);
        break;
      case "checkSyntax":
        await this.checkSyntax(error);
        break;
      default:
        console.log(`⚠️ 未知の修正アクション: ${action}`);
    }
  }

  async checkNetworkConnection() {
    console.log("🌐 ネットワーク接続を確認中...");

    // APIエンドポイントの接続テスト
    try {
      const response = await this.page.request.get(
        "http://localhost:8081/api/health",
      );
      if (response.ok()) {
        console.log("✅ ネットワーク接続は正常です");
      } else {
        console.log("❌ APIエンドポイントに問題があります");
      }
    } catch (error) {
      console.log("❌ ネットワーク接続に問題があります:", error.message);
    }
  }

  async checkTypeDefinitions(error) {
    console.log("🔍 型定義を確認中...");

    // エラーメッセージから変数名を抽出
    const variableMatch = error.message.match(/(\w+) is not defined/);
    if (variableMatch) {
      const variableName = variableMatch[1];
      console.log(`🔧 変数 '${variableName}' の型定義を確認してください`);
    }
  }

  async checkVariableDefinitions(error) {
    console.log("🔍 変数定義を確認中...");

    // エラーメッセージから変数名を抽出
    const variableMatch = error.message.match(/(\w+) is not defined/);
    if (variableMatch) {
      const variableName = variableMatch[1];
      console.log(`🔧 変数 '${variableName}' が定義されていません`);
    }
  }

  async checkSyntax(error) {
    console.log("🔍 構文を確認中...");

    // 構文エラーの詳細を表示
    console.log(`🔧 構文エラー: ${error.message}`);
  }

  startContinuousMonitoring() {
    // 10秒ごとにエラー状況をレポート
    setInterval(() => {
      this.generateErrorReport();
    }, 10000);
  }

  generateErrorReport() {
    if (this.errors.length === 0) {
      console.log("✅ エラーは検出されていません");
      return;
    }

    console.log(`\n📊 エラーレポート (${this.errors.length}件のエラー)`);
    console.log("=".repeat(50));

    const errorTypes = {};
    this.errors.forEach((error) => {
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
    });

    Object.entries(errorTypes).forEach(([type, count]) => {
      console.log(`${type}: ${count}件`);
    });

    console.log("=".repeat(50));
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔚 エラー監視を停止しました");
    }
  }
}

// メイン実行
const monitor = new ErrorMonitor();

// プロセス終了時のクリーンアップ
process.on("SIGINT", async () => {
  console.log("\n🛑 監視を停止しています...");
  await monitor.stop();
  process.exit(0);
});

// 監視開始
monitor.start().catch(console.error);


