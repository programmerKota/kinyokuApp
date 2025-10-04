import { chromium } from "playwright";

// ブラウザテスト用のスクリプト
async function runBrowserTest() {
  console.log("🚀 ブラウザテストを開始します...");

  const browser = await chromium.launch({
    headless: false, // ブラウザを表示
    devtools: true, // 開発者ツールを開く
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  try {
    // ローカルサーバーにアクセス
    console.log("📱 アプリケーションにアクセス中...");
    await page.goto("http://localhost:8081"); // Expoのデフォルトポート

    // ページの読み込み完了を待つ
    await page.waitForLoadState("networkidle");

    console.log("✅ ページが正常に読み込まれました");

    // スクリーンショットを撮影
    await page.screenshot({
      path: "browser-test-screenshot.png",
      fullPage: true,
    });
    console.log(
      "📸 スクリーンショットを保存しました: browser-test-screenshot.png",
    );

    // コンソールエラーを監視
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error("❌ ブラウザエラー:", msg.text());
      } else if (msg.type() === "warn") {
        console.warn("⚠️ ブラウザ警告:", msg.text());
      }
    });

    // ネットワークエラーを監視
    page.on("response", (response) => {
      if (!response.ok()) {
        console.error(
          `❌ ネットワークエラー: ${response.status()} ${response.url()}`,
        );
      }
    });

    // ページの要素を確認
    console.log("🔍 ページ要素を確認中...");

    // メインコンテンツの存在確認
    const mainContent = await page.locator("body").first();
    if (await mainContent.isVisible()) {
      console.log("✅ メインコンテンツが表示されています");
    }

    // エラーバウンダリーの確認
    const errorBoundary = await page
      .locator('[data-testid="error-boundary"]')
      .first();
    if (await errorBoundary.isVisible()) {
      console.log("❌ エラーバウンダリーが表示されています");
      const errorMessage = await errorBoundary.textContent();
      console.log("エラーメッセージ:", errorMessage);
    }

    // ユーザー操作をシミュレート
    console.log("👆 ユーザー操作をシミュレート中...");

    // ボタンクリックのテスト
    const buttons = await page.locator("button").all();
    console.log(`🔘 ${buttons.length}個のボタンが見つかりました`);

    // 入力フィールドのテスト
    const inputs = await page.locator("input").all();
    console.log(`📝 ${inputs.length}個の入力フィールドが見つかりました`);

    // 5秒間待機（手動操作の時間）
    console.log("⏳ 5秒間待機中...（手動操作可能）");
    await page.waitForTimeout(5000);
  } catch (error) {
    console.error("❌ ブラウザテスト中にエラーが発生しました:", error);
  } finally {
    await browser.close();
    console.log("🔚 ブラウザを閉じました");
  }
}

// スクリプト実行
runBrowserTest().catch(console.error);


