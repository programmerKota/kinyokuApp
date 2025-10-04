import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// 改善されたブラウザテスト
class ImprovedBrowserTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      errors: [],
      warnings: [],
      performance: [],
      screenshots: [],
      network: [],
      console: [],
      fixes: [],
    };
  }

  async start() {
    console.log("🚀 改善されたブラウザテストを開始します...");

    this.browser = await chromium.launch({
      headless: false,
      devtools: true,
      args: [
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    this.page = await context.newPage();

    // イベントリスナーを設定
    this.setupEventListeners();

    try {
      await this.testApplication();
      await this.testNavigation();
      await this.testUserInteractions();
      await this.testPerformance();
      await this.testNetworkRequests();
      await this.testErrorHandling();

      this.generateReport();
    } catch (error) {
      console.error("❌ テスト中にエラーが発生しました:", error);
      this.results.errors.push({
        type: "TestError",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      await this.cleanup();
    }
  }

  setupEventListeners() {
    // コンソールメッセージを監視
    this.page.on("console", (msg) => {
      const logData = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location(),
      };

      this.results.console.push(logData);

      if (msg.type() === "error") {
        this.results.errors.push({
          type: "ConsoleError",
          message: msg.text(),
          timestamp: new Date().toISOString(),
        });
        console.error("❌ コンソールエラー:", msg.text());
      } else if (msg.type() === "warn") {
        this.results.warnings.push({
          type: "ConsoleWarning",
          message: msg.text(),
          timestamp: new Date().toISOString(),
        });
        console.warn("⚠️ コンソール警告:", msg.text());
      }
    });

    // ページエラーを監視
    this.page.on("pageerror", (error) => {
      this.results.errors.push({
        type: "PageError",
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      console.error("❌ ページエラー:", error.message);
    });

    // ネットワークリクエストを監視
    this.page.on("response", (response) => {
      const networkData = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString(),
      };

      this.results.network.push(networkData);

      if (!response.ok()) {
        this.results.errors.push({
          type: "NetworkError",
          message: `${response.status()} ${response.url()}`,
          timestamp: new Date().toISOString(),
        });
        console.error(
          `❌ ネットワークエラー: ${response.status()} ${response.url()}`,
        );
      }
    });

    // 未処理のPromise拒否を監視
    this.page.on("unhandledrejection", (error) => {
      this.results.errors.push({
        type: "UnhandledRejection",
        message: error,
        timestamp: new Date().toISOString(),
      });
      console.error("❌ 未処理のPromise拒否:", error);
    });
  }

  async testApplication() {
    console.log("📱 アプリケーションの基本テスト...");

    try {
      // アプリケーションにアクセス
      console.log("🌐 http://localhost:8081 にアクセス中...");
      await this.page.goto("http://localhost:8081", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // ページの読み込み完了を待つ
      await this.page.waitForLoadState("networkidle");

      // スクリーンショットを撮影
      const screenshotPath = `debug-screenshots/improved-initial-load-${Date.now()}.png`;
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      this.results.screenshots.push(screenshotPath);
      console.log("📸 初期読み込みスクリーンショット:", screenshotPath);

      // ページタイトルを確認
      const title = await this.page.title();
      console.log("📄 ページタイトル:", title);

      // メインコンテンツの存在確認
      const body = await this.page.locator("body").first();
      if (await body.isVisible()) {
        console.log("✅ メインコンテンツが表示されています");
      } else {
        console.log("❌ メインコンテンツが表示されていません");
      }
    } catch (error) {
      console.error("❌ アプリケーションアクセスエラー:", error.message);
      this.results.errors.push({
        type: "ApplicationAccessError",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async testNavigation() {
    console.log("🧭 ナビゲーションテスト...");

    try {
      // より適切なセレクターでナビゲーションをテスト
      const navigationSelectors = [
        {
          name: "Home",
          selector:
            '[data-testid="home-tab"], [role="tab"]:has-text("Home"), .tab:has-text("Home")',
        },
        {
          name: "Tournaments",
          selector:
            '[data-testid="tournaments-tab"], [role="tab"]:has-text("Tournaments"), .tab:has-text("Tournaments")',
        },
        {
          name: "Community",
          selector:
            '[data-testid="community-tab"], [role="tab"]:has-text("Community"), .tab:has-text("Community")',
        },
        {
          name: "Settings",
          selector:
            '[data-testid="settings-tab"], [role="tab"]:has-text("Settings"), .tab:has-text("Settings")',
        },
      ];

      for (const { name, selector } of navigationSelectors) {
        console.log(`🔍 ${name}タブをテスト中...`);

        try {
          // 複数のセレクターを試す
          const selectors = selector.split(", ");
          let tabElement = null;

          for (const sel of selectors) {
            try {
              tabElement = await this.page.locator(sel).first();
              if (await tabElement.isVisible()) {
                console.log(`✅ ${name}タブが見つかりました: ${sel}`);
                break;
              }
            } catch (e) {
              // セレクターが見つからない場合は次を試す
              continue;
            }
          }

          if (tabElement && (await tabElement.isVisible())) {
            // タブがクリック可能かチェック
            const isClickable = await tabElement.evaluate((el) => {
              const style = window.getComputedStyle(el);
              return style.pointerEvents !== "none" && !el.disabled;
            });

            if (isClickable) {
              await tabElement.click({ force: true });
              await this.page.waitForTimeout(2000);

              // タブクリック後のスクリーンショット
              const screenshotPath = `debug-screenshots/improved-tab-${name.toLowerCase()}-${Date.now()}.png`;
              await this.page.screenshot({
                path: screenshotPath,
                fullPage: true,
              });
              this.results.screenshots.push(screenshotPath);
              console.log(`✅ ${name}タブが正常に動作しています`);
            } else {
              console.log(
                `⚠️ ${name}タブはクリックできません（pointer-events: none）`,
              );
              this.results.warnings.push({
                type: "NavigationWarning",
                message: `${name}タブがクリックできません`,
                timestamp: new Date().toISOString(),
              });
            }
          } else {
            console.log(`⚠️ ${name}タブが見つかりません`);
            this.results.warnings.push({
              type: "NavigationWarning",
              message: `${name}タブが見つかりません`,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`❌ ${name}タブテストエラー:`, error.message);
          this.results.errors.push({
            type: "NavigationError",
            message: `${name}タブテストエラー: ${error.message}`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("❌ ナビゲーションテストエラー:", error.message);
    }
  }

  async testUserInteractions() {
    console.log("👆 ユーザーインタラクションテスト...");

    try {
      // より包括的なボタン検索
      const buttonSelectors = [
        "button",
        '[role="button"]',
        ".button",
        '[data-testid*="button"]',
        'input[type="button"]',
        'input[type="submit"]',
      ];

      let totalButtons = 0;
      for (const selector of buttonSelectors) {
        const buttons = await this.page.locator(selector).all();
        totalButtons += buttons.length;
      }

      console.log(`🔘 合計 ${totalButtons}個のボタン要素が見つかりました`);

      // 実際にクリック可能なボタンをテスト
      const clickableButtons = await this.page
        .locator('button:visible, [role="button"]:visible')
        .all();
      console.log(
        `🔘 ${clickableButtons.length}個のクリック可能なボタンが見つかりました`,
      );

      for (let i = 0; i < Math.min(clickableButtons.length, 3); i++) {
        try {
          const button = clickableButtons[i];
          if (await button.isVisible()) {
            const buttonText = await button.textContent();
            console.log(
              `🔍 ボタン${i + 1}をテスト中: "${buttonText?.trim() || "テキストなし"}"`,
            );

            await button.click({ force: true });
            await this.page.waitForTimeout(1000);

            // ボタンクリック後のスクリーンショット
            const screenshotPath = `debug-screenshots/improved-button-${i + 1}-${Date.now()}.png`;
            await this.page.screenshot({
              path: screenshotPath,
              fullPage: true,
            });
            this.results.screenshots.push(screenshotPath);
          }
        } catch (error) {
          console.error(`❌ ボタン${i + 1}テストエラー:`, error.message);
        }
      }

      // 入力フィールドのテスト
      const inputSelectors = [
        "input",
        "textarea",
        '[contenteditable="true"]',
        '[data-testid*="input"]',
      ];

      let totalInputs = 0;
      for (const selector of inputSelectors) {
        const inputs = await this.page.locator(selector).all();
        totalInputs += inputs.length;
      }

      console.log(`📝 合計 ${totalInputs}個の入力フィールドが見つかりました`);

      const visibleInputs = await this.page
        .locator("input:visible, textarea:visible")
        .all();
      console.log(
        `📝 ${visibleInputs.length}個の表示されている入力フィールドが見つかりました`,
      );

      for (let i = 0; i < Math.min(visibleInputs.length, 3); i++) {
        try {
          const input = visibleInputs[i];
          if (await input.isVisible()) {
            console.log(`🔍 入力フィールド${i + 1}をテスト中`);

            await input.click();
            await input.fill("テスト入力");
            await this.page.waitForTimeout(500);

            // 入力後のスクリーンショット
            const screenshotPath = `debug-screenshots/improved-input-${i + 1}-${Date.now()}.png`;
            await this.page.screenshot({
              path: screenshotPath,
              fullPage: true,
            });
            this.results.screenshots.push(screenshotPath);
          }
        } catch (error) {
          console.error(
            `❌ 入力フィールド${i + 1}テストエラー:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error("❌ ユーザーインタラクションテストエラー:", error.message);
    }
  }

  async testPerformance() {
    console.log("⚡ パフォーマンステスト...");

    try {
      // パフォーマンスメトリクスを取得
      const metrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        return {
          loadTime: navigation
            ? navigation.loadEventEnd - navigation.loadEventStart
            : 0,
          domContentLoaded: navigation
            ? navigation.domContentLoadedEventEnd -
              navigation.domContentLoadedEventStart
            : 0,
          firstPaint:
            performance
              .getEntriesByType("paint")
              .find((entry) => entry.name === "first-paint")?.startTime || 0,
          firstContentfulPaint:
            performance
              .getEntriesByType("paint")
              .find((entry) => entry.name === "first-contentful-paint")
              ?.startTime || 0,
        };
      });

      this.results.performance.push(metrics);
      console.log("📊 パフォーマンスメトリクス:", metrics);

      // メモリ使用量を確認
      const memoryInfo = await this.page.evaluate(() => {
        return performance.memory
          ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            }
          : null;
      });

      if (memoryInfo) {
        console.log("🧠 メモリ使用量:", memoryInfo);
        this.results.performance.push({ memory: memoryInfo });
      }
    } catch (error) {
      console.error("❌ パフォーマンステストエラー:", error.message);
    }
  }

  async testNetworkRequests() {
    console.log("🌐 ネットワークリクエストテスト...");

    try {
      // ネットワークリクエストの統計を取得
      const networkStats = this.results.network.reduce(
        (stats, request) => {
          stats.total++;
          if (request.status >= 200 && request.status < 300) {
            stats.success++;
          } else if (request.status >= 400) {
            stats.errors++;
          }
          return stats;
        },
        { total: 0, success: 0, errors: 0 },
      );

      console.log("📈 ネットワーク統計:", networkStats);

      // 失敗したリクエストを詳細表示
      const failedRequests = this.results.network.filter(
        (req) => req.status >= 400,
      );
      if (failedRequests.length > 0) {
        console.log("❌ 失敗したリクエスト:");
        failedRequests.forEach((req) => {
          console.log(`  - ${req.status} ${req.url}`);
        });
      }
    } catch (error) {
      console.error("❌ ネットワークテストエラー:", error.message);
    }
  }

  async testErrorHandling() {
    console.log("🛡️ エラーハンドリングテスト...");

    try {
      // エラーバウンダリーの確認
      const errorBoundary = await this.page
        .locator('[data-testid="error-boundary"]')
        .first();
      if (await errorBoundary.isVisible()) {
        console.log("❌ エラーバウンダリーが表示されています");
        const errorMessage = await errorBoundary.textContent();
        console.log("エラーメッセージ:", errorMessage);
      } else {
        console.log("✅ エラーバウンダリーは表示されていません");
      }

      // コンソールエラーの詳細分析
      const consoleErrors = this.results.console.filter(
        (log) => log.type === "error",
      );
      if (consoleErrors.length > 0) {
        console.log(
          `❌ ${consoleErrors.length}件のコンソールエラーが検出されました:`,
        );
        consoleErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.text}`);
        });
      }

      // 警告の分析
      const consoleWarnings = this.results.console.filter(
        (log) => log.type === "warn",
      );
      if (consoleWarnings.length > 0) {
        console.log(
          `⚠️ ${consoleWarnings.length}件のコンソール警告が検出されました:`,
        );
        consoleWarnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning.text}`);
        });

        // 警告に対する修正提案
        this.generateFixSuggestions(consoleWarnings);
      }
    } catch (error) {
      console.error("❌ エラーハンドリングテストエラー:", error.message);
    }
  }

  generateFixSuggestions(warnings) {
    console.log("🔧 修正提案を生成中...");

    warnings.forEach((warning) => {
      if (warning.text.includes("shadow*")) {
        this.results.fixes.push({
          type: "StyleFix",
          issue: "shadow* style props are deprecated",
          suggestion: "Use 'boxShadow' instead of 'shadow*' props",
          priority: "medium",
        });
      }

      if (warning.text.includes("props.pointerEvents")) {
        this.results.fixes.push({
          type: "StyleFix",
          issue: "props.pointerEvents is deprecated",
          suggestion: "Use style.pointerEvents instead of props.pointerEvents",
          priority: "high",
        });
      }

      if (warning.text.includes("TouchableWithoutFeedback")) {
        this.results.fixes.push({
          type: "ComponentFix",
          issue: "TouchableWithoutFeedback is deprecated",
          suggestion: "Replace TouchableWithoutFeedback with Pressable",
          priority: "high",
        });
      }
    });

    if (this.results.fixes.length > 0) {
      console.log("🔧 修正提案:");
      this.results.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. [${fix.priority}] ${fix.issue}`);
        console.log(`     → ${fix.suggestion}`);
      });
    }
  }

  generateReport() {
    console.log("\n📊 テストレポートを生成中...");

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length,
        totalScreenshots: this.results.screenshots.length,
        totalNetworkRequests: this.results.network.length,
        totalConsoleLogs: this.results.console.length,
        totalFixes: this.results.fixes.length,
      },
      errors: this.results.errors,
      warnings: this.results.warnings,
      performance: this.results.performance,
      screenshots: this.results.screenshots,
      network: this.results.network,
      console: this.results.console,
      fixes: this.results.fixes,
    };

    // レポートをファイルに保存
    const reportPath = `debug-report-improved-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log("📄 詳細レポート:", reportPath);

    // サマリーを表示
    console.log("\n" + "=".repeat(50));
    console.log("📊 改善されたテスト結果サマリー");
    console.log("=".repeat(50));
    console.log(`❌ エラー: ${report.summary.totalErrors}件`);
    console.log(`⚠️ 警告: ${report.summary.totalWarnings}件`);
    console.log(`📸 スクリーンショット: ${report.summary.totalScreenshots}件`);
    console.log(
      `🌐 ネットワークリクエスト: ${report.summary.totalNetworkRequests}件`,
    );
    console.log(`📝 コンソールログ: ${report.summary.totalConsoleLogs}件`);
    console.log(`🔧 修正提案: ${report.summary.totalFixes}件`);
    console.log("=".repeat(50));

    if (report.summary.totalErrors > 0) {
      console.log("\n❌ 検出されたエラー:");
      report.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.message}`);
      });
    }

    if (report.summary.totalWarnings > 0) {
      console.log("\n⚠️ 検出された警告:");
      report.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. [${warning.type}] ${warning.message}`);
      });
    }

    if (report.summary.totalFixes > 0) {
      console.log("\n🔧 修正提案:");
      report.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. [${fix.priority}] ${fix.issue}`);
        console.log(`     → ${fix.suggestion}`);
      });
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log("🔚 ブラウザを閉じました");
    }
  }
}

// メイン実行
const test = new ImprovedBrowserTest();
test.start().catch(console.error);
