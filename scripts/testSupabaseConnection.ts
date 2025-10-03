#!/usr/bin/env tsx

/**
 * Supabase接続テスト（Node専用・Expo依存なし）
 * 使い方:
 *   - 読み取りのみ: npx tsx scripts/testSupabaseConnection.ts
 *   - CRUD検証あり: npx tsx scripts/testSupabaseConnection.ts --crud
 */

// 1) dotenv で .env.supabase -> .env を優先的に読み込む（任意）
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");
  const rootDir = process.cwd();
  const supabaseEnvPath = path.join(rootDir, ".env.supabase");
  const defaultEnvPath = path.join(rootDir, ".env");
  if (fs.existsSync(supabaseEnvPath)) {
    dotenv.config({ path: supabaseEnvPath });
    console.log("🧩 Loaded .env.supabase");
  } else if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    console.log("🧩 Loaded .env");
  } else {
    dotenv.config();
  }
} catch {}

// dotenv が無い環境向けの簡易ローダー
(() => {
  if (
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require("path");
    const rootDir = process.cwd();
    const supaPath = path.join(rootDir, ".env.supabase");
    const envPath = path.join(rootDir, ".env");
    const target = fs.existsSync(supaPath)
      ? supaPath
      : fs.existsSync(envPath)
        ? envPath
        : undefined;
    if (!target) return;
    const content = fs.readFileSync(target, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const k = m[1];
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
    console.log(`🧩 Loaded ${target}`);
  } catch {}
})();

type Step = {
  step: string;
  ok: boolean;
  status?: number;
  info?: any;
  error?: string;
};

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

async function testSupabaseConnection(doCrud = false) {
  const result: { ok: boolean; url: string; steps: Step[]; error?: string } = {
    ok: false,
    url: baseUrl || "<unset>",
    steps: [],
  };

  // 2) 前提チェック
  if (!baseUrl || !anonKey) {
    result.error = "missing url or anon key";
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  try {
    // 3) /auth/v1/health で疎通確認
    const health = await rest("/auth/v1/health", { method: "GET" });
    result.steps.push({ step: "health", ok: health.ok, status: health.status });

    // 4) 読み取りの軽い確認（test_items から1件取得）
    const select = await rest("/rest/v1/test_items?select=*&limit=1", {
      method: "GET",
      headers: { Prefer: "count=exact" },
    });
    const rows = Array.isArray(select.json) ? (select.json as any[]) : [];
    result.steps.push({
      step: "select_sample",
      ok: select.ok,
      status: select.status,
      info: { sample_count: rows.length },
    });

    // 5) --crud 指定時のみ挿入/更新/削除を実施
    if (doCrud) {
      const insert = await rest("/rest/v1/test_items", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          title: `node_test_${new Date().toISOString()}`,
        }),
      });
      if (!insert.ok || !Array.isArray(insert.json) || !insert.json?.[0]?.id) {
        throw new Error(
          `insert status=${insert.status} body=${JSON.stringify(
            insert.json ?? insert.text,
          )}`,
        );
      }
      const inserted = (insert.json as any[])[0];
      result.steps.push({
        step: "insert",
        ok: true,
        status: insert.status,
        info: { id: inserted.id },
      });

      const update = await rest(`/rest/v1/test_items?id=eq.${inserted.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ title: "node_test_updated" }),
      });
      result.steps.push({
        step: "update",
        ok: update.ok,
        status: update.status,
      });

      const del = await rest(`/rest/v1/test_items?id=eq.${inserted.id}`, {
        method: "DELETE",
      });
      result.steps.push({ step: "delete", ok: del.ok, status: del.status });
    }

    result.ok = result.steps.every((s) => s.ok);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } catch (e: any) {
    result.steps.push({
      step: "error",
      ok: false,
      error: e?.message || String(e),
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

// 6) CLI 実行エントリ
if (require.main === module) {
  const doCrud = process.argv.includes("--crud");
  testSupabaseConnection(doCrud).catch(console.error);
}

export { testSupabaseConnection };
