import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Get the session or user object passed in the request
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the request body
    const { subject, message, platform } = await req.json();

    if (!subject || !message) {
      return new Response(
        JSON.stringify({ error: "Subject and message are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // まずデータベースに保存
    const { error: dbError } = await supabaseClient.from("feedback").insert({
      userId: user.id,
      subject: subject,
      message: message,
      platform: platform,
    });

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save feedback" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Resendを使用してメール送信
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log(
      "Resend API Key status:",
      resendApiKey ? "Configured" : "Not configured",
    );

    if (resendApiKey) {
      try {
        const emailData = {
          from: "onboarding@resend.dev", // 検証完了までデフォルト送信者を使用
          to: ["programmerkota07@gmail.com"],
          subject: `[フィードバック] ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">フィードバックが送信されました</h2>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #555;">フィードバック内容</h3>
                <p><strong>件名:</strong> ${subject}</p>
                <p><strong>内容:</strong></p>
                <div style="background-color: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${message}</div>
              </div>
              
              <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #555;">ユーザー情報</h4>
                <p><strong>ユーザーID:</strong> ${user.id}</p>
                <p><strong>メールアドレス:</strong> ${user.email || "未設定"}</p>
                <p><strong>プラットフォーム:</strong> ${platform || "Unknown"}</p>
                <p><strong>送信日時:</strong> ${new Date().toLocaleString("ja-JP")}</p>
              </div>
            </div>
          `,
        };

        console.log(
          "Sending email with data:",
          JSON.stringify(emailData, null, 2),
        );

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        });

        console.log("Resend response status:", resendResponse.status);

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          console.error("Resend API failed:", errorText);
        } else {
          const result = await resendResponse.json();
          console.log("Email sent successfully:", result);
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }
    } else {
      console.log("RESEND_API_KEY not configured, skipping email sending");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "フィードバックを送信しました",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
