#!/usr/bin/env tsx

// Apply a SQL migration to Supabase via Postgres connection (no CLI/UI required)
// Usage:
//   1) Set DB credentials in .env.supabase.admin (see .env.supabase.admin.example)
//   2) npx tsx scripts/applySupabaseMigration.ts --file supabase/migrations/2025-10-03_fix_schema.sql

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require("path");
  const root = process.cwd();
  const adminEnv = path.join(root, ".env.supabase.admin");
  const defEnv = path.join(root, ".env");
  if (fs.existsSync(adminEnv)) dotenv.config({ path: adminEnv });
  else if (fs.existsSync(defEnv)) dotenv.config({ path: defEnv });
  else dotenv.config();
} catch {}

import { Client } from "pg";
import fs from "fs";
import path from "path";

function getArg(name: string, fallback?: string) {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split("=")[1] : fallback;
}

async function main() {
  const file = getArg("file", "supabase/migrations/2025-10-03_fix_schema.sql");
  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.error(`SQL file not found: ${abs}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(abs, "utf8");

  const dbUrl =
    process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || undefined;

  const cfg = dbUrl
    ? { connectionString: dbUrl }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || "postgres",
        ssl: { rejectUnauthorized: false },
      };

  const missing: string[] = [];
  if (!dbUrl) {
    if (!cfg.host) missing.push("PGHOST");
    if (!cfg.user) missing.push("PGUSER");
    if (!cfg.password) missing.push("PGPASSWORD");
  }
  if (missing.length) {
    console.error(
      `Missing DB credentials: ${missing.join(", ")} (or set SUPABASE_DB_URL/DATABASE_URL)`,
    );
    process.exit(1);
  }

  const client = new Client(cfg as any);
  await client.connect();
  try {
    console.log(`Applying migration: ${abs}`);
    await client.query(sql);
    console.log("Migration applied successfully");
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e?.message || e);
    process.exit(1);
  });
}

export {};
