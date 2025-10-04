// 本番環境でのフィードバック機能テスト
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFeedbackFunction() {
  console.log("🧪 フィードバック機能のテストを開始します...");

  try {
    // テスト用のフィードバックデータ
    const testData = {
      subject: "テストフィードバック",
      message: "これは本番環境でのテスト用フィードバックです。",
      platform: "Test Environment",
    };

    console.log("📤 テストデータを送信中...", testData);

    // Edge Functionを呼び出し
    const { data, error } = await supabase.functions.invoke("send-feedback", {
      body: testData,
    });

    if (error) {
      console.error("❌ エラーが発生しました:", error);
      return;
    }

    console.log("✅ 成功:", data);
    console.log("📧 フィードバックが正常に送信されました！");
  } catch (err) {
    console.error("❌ テスト中にエラーが発生しました:", err);
  }
}

// テスト実行
testFeedbackFunction();
