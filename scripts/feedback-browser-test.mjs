// フィードバック機能のブラウザテスト
import { chromium } from "playwright";
import fs from "fs";

class FeedbackBrowserTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      errors: [],
      warnings: [],
      screenshots: [],
      console: [],
      testResults: [],
    };
  }

  async start() {
    console.log("🚀 フィードバック機能のブラウザテストを開始します...");

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
      await this.testFeedbackFunction();
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
  }

  async testFeedbackFunction() {
    console.log("📱 フィードバック機能のテスト...");

    try {
      // アプリケーションにアクセス
      console.log("🌐 http://localhost:8081 にアクセス中...");
      await this.page.goto("http://localhost:8081", {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // ページの読み込み完了を待つ
      await this.page.waitForLoadState("networkidle");

      // 初期スクリーンショット
      const initialScreenshot = `debug-screenshots/feedback-test-initial-${Date.now()}.png`;
      await this.page.screenshot({
        path: initialScreenshot,
        fullPage: true,
      });
      this.results.screenshots.push(initialScreenshot);
      console.log("📸 初期画面スクリーンショット:", initialScreenshot);

      // Settingsタブに移動
      console.log("🔍 Settingsタブを探しています...");
      const settingsTab = this.page.locator('[role="tab"]:has-text("Settings")');

      if (await settingsTab.isVisible()) {
        console.log("✅ Settingsタブが見つかりました");
        await settingsTab.click();
        await this.page.waitForTimeout(2000);

        // Settings画面のスクリーンショット
        const settingsScreenshot = `debug-screenshots/feedback-test-settings-${Date.now()}.png`;
        await this.page.screenshot({
          path: settingsScreenshot,
          fullPage: true,
        });
        this.results.screenshots.push(settingsScreenshot);
        console.log("📸 Settings画面スクリーンショット:", settingsScreenshot);

        // フィードバックボタンを探す
        console.log("🔍 フィードバックボタンを探しています...");
        const feedbackSelectors = [
          "text=フィードバック",
          "text=Feedback",
          '[data-testid*="feedback"]',
          'button:has-text("フィードバック")',
          'button:has-text("Feedback")',
        ];

        let feedbackButton = null;
        for (const selector of feedbackSelectors) {
          try {
            feedbackButton = this.page.locator(selector).first();
            if (await feedbackButton.isVisible()) {
              console.log(`✅ フィードバックボタンが見つかりました: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (feedbackButton && (await feedbackButton.isVisible())) {
          console.log("🔘 フィードバックボタンをクリック中...");
          await feedbackButton.click();
          await this.page.waitForTimeout(3000);

          // フィードバック画面のスクリーンショット
          const feedbackScreenshot = `debug-screenshots/feedback-test-screen-${Date.now()}.png`;
          await this.page.screenshot({
            path: feedbackScreenshot,
            fullPage: true,
          });
          this.results.screenshots.push(feedbackScreenshot);
          console.log("📸 フィードバック画面スクリーンショット:", feedbackScreenshot);

          // フィードバックフォームのテスト
          await this.testFeedbackForm();
        } else {
          console.log("⚠️ フィードバックボタンが見つかりません");
          this.results.warnings.push({
            type: "NavigationWarning",
            message: "フィードバックボタンが見つかりません",
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        console.log("⚠️ Settingsタブが見つかりません");
        this.results.warnings.push({
          type: "NavigationWarning",
          message: "Settingsタブが見つかりません",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("❌ フィードバック機能テストエラー:", error.message);
      this.results.errors.push({
        type: "FeedbackTestError",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async testFeedbackForm() {
    console.log("📝 フィードバックフォームのテスト...");

    try {
      // 件名入力フィールドを探す
      const subjectSelectors = [
        'input[placeholder*="件名"]',
        'input[placeholder*="例"]',
        'input[type="text"]',
      ];

      let subjectInput = null;
      for (const selector of subjectSelectors) {
        try {
          subjectInput = this.page.locator(selector).first();
          if (await subjectInput.isVisible()) {
            console.log(`✅ 件名入力フィールドが見つかりました: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (subjectInput && (await subjectInput.isVisible())) {
        console.log("📝 件名を入力中...");
        await subjectInput.fill("ブラウザテスト用フィードバック");
        await this.page.waitForTimeout(500);
        this.results.testResults.push({
          test: "件名入力",
          status: "success",
          message: "件名入力フィールドに正常に入力できました",
        });
      } else {
        console.log("⚠️ 件名入力フィールドが見つかりません");
        this.results.testResults.push({
          test: "件名入力",
          status: "failed",
          message: "件名入力フィールドが見つかりません",
        });
      }

      // 内容入力フィールドを探す
      const messageSelectors = [
        "textarea",
        'input[placeholder*="内容"]',
        'input[placeholder*="具体的"]',
      ];

      let messageInput = null;
      for (const selector of messageSelectors) {
        try {
          messageInput = this.page.locator(selector).first();
          if (await messageInput.isVisible()) {
            console.log(`✅ 内容入力フィールドが見つかりました: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (messageInput && (await messageInput.isVisible())) {
        console.log("📝 内容を入力中...");
        await messageInput.fill(
          "これはブラウザテスト用のフィードバックです。メール送信機能のテストを行っています。",
        );
        await this.page.waitForTimeout(500);
        this.results.testResults.push({
          test: "内容入力",
          status: "success",
          message: "内容入力フィールドに正常に入力できました",
        });
      } else {
        console.log("⚠️ 内容入力フィールドが見つかりません");
        this.results.testResults.push({
          test: "内容入力",
          status: "failed",
          message: "内容入力フィールドが見つかりません",
        });
      }

      // 送信ボタンを探す
      const submitSelectors = [
        'button:has-text("送信")',
        'button:has-text("メールで送信")',
        'button[type="submit"]',
        'button:has-text("Submit")',
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = this.page.locator(selector).first();
          if (await submitButton.isVisible()) {
            console.log(`✅ 送信ボタンが見つかりました: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (submitButton && (await submitButton.isVisible())) {
        console.log("🔘 送信ボタンをクリック中...");

        // 送信前のスクリーンショット
        const beforeSubmitScreenshot = `debug-screenshots/feedback-test-before-submit-${Date.now()}.png`;
        await this.page.screenshot({
          path: beforeSubmitScreenshot,
          fullPage: true,
        });
        this.results.screenshots.push(beforeSubmitScreenshot);
        console.log("📸 送信前スクリーンショット:", beforeSubmitScreenshot);

        // 送信ボタンをクリック
        await submitButton.click();
        await this.page.waitForTimeout(3000);

        // 送信後のスクリーンショット
        const afterSubmitScreenshot = `debug-screenshots/feedback-test-after-submit-${Date.now()}.png`;
        await this.page.screenshot({
          path: afterSubmitScreenshot,
          fullPage: true,
        });
        this.results.screenshots.push(afterSubmitScreenshot);
        console.log("📸 送信後スクリーンショット:", afterSubmitScreenshot);

        // 成功メッセージを確認
        const successSelectors = [
          "text=送信しました",
          "text=フィードバックを送信しました",
          "text=ありがとうございます",
        ];

        let successMessage = false;
        for (const selector of successSelectors) {
          try {
            const element = this.page.locator(selector).first();
            if (await element.isVisible()) {
              console.log(`✅ 成功メッセージが見つかりました: ${selector}`);
              successMessage = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (successMessage) {
          console.log("✅ フィードバック送信が成功しました！");
          this.results.testResults.push({
            test: "フィードバック送信",
            status: "success",
            message: "フィードバックが正常に送信されました",
          });
        } else {
          console.log("⚠️ 成功メッセージが確認できません");
          this.results.testResults.push({
            test: "フィードバック送信",
            status: "warning",
            message: "送信は実行されましたが、成功メッセージが確認できません",
          });
        }
      } else {
        console.log("⚠️ 送信ボタンが見つかりません");
        this.results.testResults.push({
          test: "送信ボタン",
          status: "failed",
          message: "送信ボタンが見つかりません",
        });
      }
    } catch (error) {
      console.error("❌ フィードバックフォームテストエラー:", error.message);
      this.results.errors.push({
        type: "FormTestError",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  generateReport() {
    console.log("\n📊 フィードバック機能テストレポートを生成中...");

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length,
        totalScreenshots: this.results.screenshots.length,
        totalConsoleLogs: this.results.console.length,
        totalTests: this.results.testResults.length,
        passedTests: this.results.testResults.filter(t => t.status === "success").length,
        failedTests: this.results.testResults.filter(t => t.status === "failed").length,
        warningTests: this.results.testResults.filter(t => t.status === "warning").length,
      },
      errors: this.results.errors,
      warnings: this.results.warnings,
      screenshots: this.results.screenshots,
      console: this.results.console,
      testResults: this.results.testResults,
    };

    // レポートをファイルに保存
    const reportPath = `debug-report-feedback-browser-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log("📄 詳細レポート:", reportPath);

    // サマリーを表示
    console.log("\n" + "=".repeat(60));
    console.log("📊 フィードバック機能テスト結果サマリー");
    console.log("=".repeat(60));
    console.log(`❌ エラー: ${report.summary.totalErrors}件`);
    console.log(`⚠️ 警告: ${report.summary.totalWarnings}件`);
    console.log(`📸 スクリーンショット: ${report.summary.totalScreenshots}件`);
    console.log(`📝 コンソールログ: ${report.summary.totalConsoleLogs}件`);
    console.log(`🧪 テスト: ${report.summary.totalTests}件`);
    console.log(`✅ 成功: ${report.summary.passedTests}件`);
    console.log(`❌ 失敗: ${report.summary.failedTests}件`);
    console.log(`⚠️ 警告: ${report.summary.warningTests}件`);
    console.log("=".repeat(60));

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

    if (report.summary.totalTests > 0) {
      console.log("\n🧪 テスト結果:");
      report.testResults.forEach((test, index) => {
        const status = test.status === "success" ? "✅" : test.status === "failed" ? "❌" : "⚠️";
        console.log(`  ${index + 1}. ${status} ${test.test}: ${test.message}`);
      });
    }

    // 最終判定
    if (report.summary.failedTests === 0 && report.summary.totalErrors === 0) {
      console.log("\n🎉 フィードバック機能は正常に動作しています！");
    } else {
      console.log("\n⚠️ フィードバック機能に問題があります。詳細を確認してください。");
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
const test = new FeedbackBrowserTest();
test.start().catch(console.error);
