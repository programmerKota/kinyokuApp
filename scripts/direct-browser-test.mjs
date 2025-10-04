import { chromium } from "playwright";

async function directBrowserTest() {
  console.log("🔍 直接ブラウザテストを開始します...");

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  // コンソールメッセージを監視
  page.on("console", (msg) => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // ネットワークリクエストを監視
  page.on("response", (response) => {
    console.log(`[${response.status()}] ${response.url()}`);
  });

  try {
    console.log("🌐 メインページにアクセス中...");
    await page.goto("http://localhost:8081", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log("📄 ページタイトル:", await page.title());

    // ページのHTMLを確認
    const html = await page.content();
    console.log("📝 HTMLの最初の500文字:");
    console.log(html.substring(0, 500));

    // エラーメッセージを探す
    const errorElements = await page.locator("text=/error|Error|ERROR/").all();
    console.log(`🔍 エラー関連の要素: ${errorElements.length}個`);

    for (let i = 0; i < Math.min(errorElements.length, 5); i++) {
      const text = await errorElements[i].textContent();
      console.log(`  ${i + 1}. ${text}`);
    }

    // スクリーンショットを撮影
    await page.screenshot({
      path: "debug-screenshots/direct-test.png",
      fullPage: true,
    });
    console.log("📸 スクリーンショットを保存しました");

    // 5秒待機
    console.log("⏳ 5秒待機中...");
    await page.waitForTimeout(5000);
  } catch (error) {
    console.error("❌ エラーが発生しました:", error.message);
  } finally {
    await browser.close();
    console.log("🔚 ブラウザを閉じました");
  }
}

directBrowserTest().catch(console.error);


