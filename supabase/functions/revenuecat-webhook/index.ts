import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    ...init,
  });
}

async function verifySignature(raw: string, req: Request): Promise<boolean> {
  try {
    const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    // セキュリティ: シークレット未設定時は検証失敗（fail-closed）
    if (!secret) return false;
    const header = req.headers.get("X-RevenueCat-Signature") || req.headers.get("X-Signature");
    if (!header) return false;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(raw));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // header can be hex or base64; support both best-effort
    const headerVal = header.trim();
    if (headerVal.includes("=") || headerVal.includes("+") || headerVal.includes("/")) {
      // base64
      const b64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(sig))));
      return b64 === headerVal;
    }
    return hex === headerVal.toLowerCase();
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  // Use service role to bypass RLS for server-side webhook processing (required)
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRole) {
    return json({ error: "server_misconfigured" }, { status: 500 });
  }
  const adminClient = createClient(supabaseUrl, serviceRole);

  try {
    const raw = await req.text();
    if (!(await verifySignature(raw, req))) {
      return json({ error: "invalid_signature" }, { status: 401 });
    }
    let payload: any;
    try { payload = JSON.parse(raw || "{}"); } catch { return json({ error: "invalid_json" }, { status: 400 }); }

    // Best-effort extraction across RC webhook variants
    const ev = (payload?.event ?? payload) as any;
    const typeRaw: string = String(ev?.type || ev?.event || "").toLowerCase();
    const appUserId: string | undefined = ev?.app_user_id || ev?.data?.app_user_id || payload?.app_user_id;
    const productId: string | undefined = ev?.product_id || ev?.data?.product_id || ev?.transaction?.product_id;
    const transactionId: string | undefined = ev?.transaction_id || ev?.data?.transaction_id || ev?.original_transaction_id;
    const platform: string | undefined = ev?.store || ev?.environment || ev?.platform;
    let amount: number | null = null;
    try {
      const price = ev?.price ?? ev?.data?.price;
      if (typeof price === "number") amount = Math.round(price);
      else if (typeof price?.amount_micros === "number") amount = Math.round(price.amount_micros / 1_000_000);
    } catch {}

    // Map RC event types to our status
    const t = typeRaw;
    const successTypes = ["initial_purchase", "purchase", "renewal", "non_renewing_purchase", "product_change", "transfer"];
    const refundTypes = ["refund", "grace_period_expired"];
    const cancelTypes = ["cancellation", "expiration", "unsubscribe"];
    let status: "success" | "error" | "cancel" | "ok" = "ok";
    if (successTypes.includes(t)) status = "success";
    else if (refundTypes.includes(t)) status = "error";
    else if (cancelTypes.includes(t)) status = "cancel";

    // Log to payment_logs when user id is present
    if (appUserId) {
      await adminClient
        .from("payment_logs")
        .insert({
          userId: appUserId,
          event: `rc:${typeRaw || "unknown"}`,
          status,
          amount: amount ?? null,
          productId: productId ?? null,
          platform: platform ?? null,
          transactionId: transactionId ?? null,
          raw: payload,
        });
    }

    // Update payments table on successful purchase/renewal
    if (appUserId && (successTypes.includes(t) || cancelTypes.includes(t) || refundTypes.includes(t))) {
      const tx = transactionId || `${productId || "unknown"}-${typeRaw}`;
      // Deduplicate by (userId, transactionId)
      const { data: existing } = await adminClient
        .from("payments")
        .select("id, status")
        .eq("userId", appUserId)
        .eq("transactionId", tx)
        .limit(1)
        .maybeSingle();

      let newStatus: "completed" | "failed" | "refunded" = "completed";
      if (cancelTypes.includes(t)) newStatus = "failed";
      if (refundTypes.includes(t)) newStatus = "refunded";

      if (!existing) {
        await adminClient.from("payments").insert({
          userId: appUserId,
          amount: amount ?? 0,
          type: "penalty",
          status: newStatus,
          transactionId: tx,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else if ((existing as any)?.id) {
        await adminClient
          .from("payments")
          .update({ status: newStatus, updatedAt: new Date().toISOString() })
          .eq("id", (existing as any).id);
      }
    }

    return json({ ok: true });
  } catch (e) {
    console.error("rc-webhook error", e);
    return json({ error: "internal_error" }, { status: 500 });
  }
});
