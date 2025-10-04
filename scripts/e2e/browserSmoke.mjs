import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.SMOKE_URL || 'http://localhost:8081/';
const OUT_DIR = join(process.cwd(), 'smoke-artifacts');
const SCREEN_HOME = join(OUT_DIR, 'smoke-home.png');
const SCREEN_RANK = join(OUT_DIR, 'smoke-ranking.png');
const SCREEN_COMMUNITY = join(OUT_DIR, 'smoke-community.png');
const SCREEN_PROFILE = join(OUT_DIR, 'smoke-profile.png');
const SCREEN_DIARY = join(OUT_DIR, 'smoke-diary.png');
const LOGFILE = join(OUT_DIR, 'console.log');

mkdirSync(OUT_DIR, { recursive: true });

const logs = [];
function log(line) {
  const ts = new Date().toISOString();
  const text = `[${ts}] ${line}`;
  console.log(text);
  logs.push(text);
}

async function run() {
  log(`Launching Chromium to ${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    log(`console.${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => log(`pageerror: ${err?.message || err}`));
  page.on('requestfailed', (req) => log(`requestfailed: ${req.method()} ${req.url()} -> ${req.failure()?.errorText}`));

  const t0 = Date.now();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#root', { timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.getElementById('root');
    return !!el && el.childElementCount > 0;
  }, { timeout: 60000 });
  await page.waitForTimeout(1200);

  const hasErrorOverlay = await page.evaluate(() => {
    const bodyText = document.body?.innerText || '';
    return /error/i.test(bodyText) && /stack|reference|syntax/i.test(bodyText);
  });

  await page.screenshot({ path: SCREEN_HOME, fullPage: true });
  log(`Home captured -> ${SCREEN_HOME} in ${Date.now() - t0}ms`);

  // Programmatic login + minimal seed (web only)
  const E2E_EMAIL = process.env.E2E_EMAIL;
  const E2E_PASSWORD = process.env.E2E_PASSWORD;
  if (E2E_EMAIL && E2E_PASSWORD) {
    try {
      const ok = await page.evaluate(async ({ email, password }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = (globalThis).__supabase;
        if (!sb?.auth) return false;
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return false;
        const sess = await sb.auth.getSession();
        const uid = sess?.data?.session?.user?.id;
        if (!uid) return false;
        const now = new Date().toISOString();
        try { await sb.from('profiles').upsert({ id: uid, displayName: 'E2E 太郎', updatedAt: now }); } catch {}
        try { await sb.from('challenges').insert({ userId: uid, goalDays: 7, penaltyAmount: 0, status: 'active', startedAt: now }); } catch {}
        try { await sb.from('community_posts').insert({ authorId: uid, content: 'E2E post ' + now }); } catch {}
        return true;
      }, { email: E2E_EMAIL, password: E2E_PASSWORD });
      log(`Programmatic login: ${ok ? 'success' : 'failed'}`);
      await page.waitForTimeout(400);
    } catch (e) {
      log(`Programmatic login error: ${e}`);
    }
  }

  // Try navigate to Ranking (Home quick button text)
  try {
    await page.getByText('ランキング', { exact: true }).first().click({ force: true });
    await page.getByText('ランキング', { exact: false }).first().waitFor({ timeout: 10000 });
    await page.screenshot({ path: SCREEN_RANK, fullPage: true });
    log(`Ranking captured -> ${SCREEN_RANK}`);
  } catch (e) {
    log(`Ranking navigation failed: ${e}`);
  }

  // Navigate to Community tab
  try {
    await page.getByText('コミュニティ', { exact: true }).first().click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: SCREEN_COMMUNITY, fullPage: true });
    log(`Community captured -> ${SCREEN_COMMUNITY}`);
  } catch (e) {
    log(`Community navigation failed: ${e}`);
  }

  // Navigate to Settings/Profile tab
  try {
    await page.getByText('設定', { exact: true }).first().click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: SCREEN_PROFILE, fullPage: true });
    log(`Profile captured -> ${SCREEN_PROFILE}`);
  } catch (e) {
    log(`Profile navigation failed: ${e}`);
  }

  // Navigate to Diary via Home quick button
  try {
    await page.getByText('ホーム', { exact: true }).first().click({ force: true });
    await page.getByText('日記', { exact: true }).first().click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({ path: SCREEN_DIARY, fullPage: true });
    log(`Diary captured -> ${SCREEN_DIARY}`);
  } catch (e) {
    log(`Diary navigation failed: ${e}`);
  }

  writeFileSync(LOGFILE, logs.join('\n'), 'utf8');
  await browser.close();

  if (hasErrorOverlay) {
    log('Detected possible error overlay text on page. Review screenshot and logs.');
    process.exitCode = 2;
  }
}

run().catch((e) => {
  log(`FATAL: ${e?.stack || e}`);
  writeFileSync(LOGFILE, logs.join('\n'), 'utf8');
  process.exit(1);
});

