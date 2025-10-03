#!/usr/bin/env tsx

// Load env from .env.supabase or .env explicitly
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");
  const root = process.cwd();
  const supaPath = path.join(root, ".env.supabase");
  const envPath = path.join(root, ".env");
  if (fs.existsSync(supaPath)) {
    dotenv.config({ path: supaPath });
    console.log("[env] loaded .env.supabase");
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log("[env] loaded .env");
  } else {
    dotenv.config();
  }
} catch {}

const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

async function rest<T>(
  path: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; json?: T; text?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = (await res.json()) as T;
      return { ok: res.ok, status: res.status, json };
    }
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCrud() {
  const result = {
    url: baseUrl || "<unset>",
    steps: [] as Array<{
      step: string;
      ok: boolean;
      info?: any;
      error?: string;
      status?: number;
    }>,
  };

  if (!baseUrl || !anonKey) {
    console.log(
      JSON.stringify(
        { ok: false, ...result, error: "missing url or anon key" },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  try {
    // 0) health
    const health = await rest("/auth/v1/health", { method: "GET" });
    result.steps.push({ step: "health", ok: health.ok, status: health.status });

    // 1) insert
    const insert = await rest("/rest/v1/test_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        title: `batch_insert_${new Date().toISOString()}`,
      }),
    });
    if (!insert.ok || !Array.isArray(insert.json) || !insert.json?.[0]?.id) {
      throw new Error(
        `insert status=${insert.status} body=${JSON.stringify(insert.json ?? insert.text)}`,
      );
    }
    const inserted = insert.json[0];
    result.steps.push({
      step: "insert",
      ok: true,
      info: { id: inserted.id },
      status: insert.status,
    });

    // 2) select
    const select = await rest(`/rest/v1/test_items?id=eq.${inserted.id}`, {
      method: "GET",
    });
    const selected = Array.isArray(select.json) ? (select.json as any[]) : [];
    result.steps.push({
      step: "select",
      ok: selected.length === 1,
      info: selected[0],
      status: select.status,
    });

    // 3) update
    const update = await rest(`/rest/v1/test_items?id=eq.${inserted.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ title: "batch_updated" }),
    });
    result.steps.push({ step: "update", ok: update.ok, status: update.status });

    // 4) delete
    const del = await rest(`/rest/v1/test_items?id=eq.${inserted.id}`, {
      method: "DELETE",
    });
    result.steps.push({ step: "delete", ok: del.ok, status: del.status });

    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    process.exit(0);
  } catch (e: any) {
    result.steps.push({
      step: "error",
      ok: false,
      error: e?.message || String(e),
    });
    console.log(JSON.stringify({ ok: false, ...result }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  runCrud();
}
