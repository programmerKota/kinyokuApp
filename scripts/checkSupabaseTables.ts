#!/usr/bin/env tsx

// Quick Supabase table existence/shape check via REST (anon key)
// Usage: npx tsx scripts/checkSupabaseTables.ts

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
  if (fs.existsSync(supaPath)) dotenv.config({ path: supaPath });
  else if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  else dotenv.config();
} catch {}

const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

type TableResult = {
  table: string;
  ok: boolean;
  status?: number;
  error?: string;
  sampleKeys?: string[];
};

async function rest(path: string, init: RequestInit) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? await res.json()
    : await res.text();
  return { res, body };
}

async function main() {
  const report: {
    ok: boolean;
    url: string;
    tables: TableResult[];
    rpcs?: any[];
  } = {
    ok: false,
    url: baseUrl || "<unset>",
    tables: [],
  };
  if (!baseUrl || !anonKey) {
    console.log(
      JSON.stringify(
        { ...report, ok: false, error: "missing url or anon key" },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const tables = [
    "profiles",
    "diaries",
    "challenges",
    "payments",
    "payment_logs",
    "community_posts",
    "community_comments",
    "community_likes",
    "follows",
    "blocks",
    "tournaments",
    "tournament_join_requests",
    "tournament_participants",
    "tournament_messages",
    "test_items",
  ];

  for (const t of tables) {
    try {
      const { res, body } = await rest(`/rest/v1/${t}?select=*&limit=1`, {
        method: "GET",
      });
      if (res.ok) {
        const rows = Array.isArray(body) ? (body as any[]) : [];
        const sampleKeys =
          rows.length > 0 ? Object.keys(rows[0]).sort() : undefined;
        report.tables.push({
          table: t,
          ok: true,
          status: res.status,
          sampleKeys,
        });
      } else {
        report.tables.push({
          table: t,
          ok: false,
          status: res.status,
          error: typeof body === "string" ? body : JSON.stringify(body),
        });
      }
    } catch (e: any) {
      report.tables.push({
        table: t,
        ok: false,
        error: e?.message || String(e),
      });
    }
  }

  // Check RPC existence (best-effort)
  const rpcs = [
    {
      name: "increment_post_likes",
      args: { p_post_id: "00000000-0000-0000-0000-000000000000", p_delta: 0 },
    },
    {
      name: "increment_post_comments",
      args: { p_post_id: "00000000-0000-0000-0000-000000000000", p_delta: 0 },
    },
  ];
  report.rpcs = [];
  for (const r of rpcs) {
    try {
      const { res, body } = await rest(`/rest/v1/rpc/${r.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "tx=rollback" },
        body: JSON.stringify(r.args),
      });
      report.rpcs.push({ name: r.name, ok: res.ok, status: res.status, body });
    } catch (e: any) {
      report.rpcs.push({
        name: r.name,
        ok: false,
        error: e?.message || String(e),
      });
    }
  }

  report.ok = report.tables.every((t) => t.ok);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export {};
