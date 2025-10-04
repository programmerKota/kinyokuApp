import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.SMOKE_URL || 'http://localhost:8081/';
const OUT_DIR = join(process.cwd(), 'smoke-artifacts');
const SCREEN_COMMUNITY = join(OUT_DIR, 'replies-community.png');
const SCREEN_AFTER = join(OUT_DIR, 'replies-after.png');
const LOGFILE = join(OUT_DIR, 'replies.log');

mkdirSync(OUT_DIR, { recursive: true });

const logs = [];
function log(line) {
  const ts = new Date().toISOString();
  const text = `[${ts}] ${line}`;
  console.log(text);
  logs.push(text);
}

async function ensureAtLeastOnePost(page) {
  // Make sure there is at least one post, created before initial fetch
  // If list is empty, the UI won't auto-refresh without a user gesture.
  // We assume a seeding step has happened before launching the browser.
  // This function simply checks and logs state from client.
  try {
    const count = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = (globalThis).__supabase;
      if (!sb) return -1;
      const { data, error } = await sb.from('community_posts').select('id', { count: 'exact', head: true });
      if (error) return -1;
      // count is only in headers; data is null. Use a second query.
      const r = await sb.from('community_posts').select('id').order('createdAt', { ascending: false }).limit(1);
      return Array.isArray(r?.data) ? r.data.length : 0;
    });
    log(`client sees posts: ${count}`);
  } catch (e) {
    log(`ensureAtLeastOnePost error: ${e}`);
  }
}

async function run() {
  log(`Launching Chromium to ${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => log(`console.${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => log(`pageerror: ${err?.message || err}`));
  page.on('requestfailed', (req) => log(`requestfailed: ${req.method()} ${req.url()} -> ${req.failure()?.errorText}`));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#root', { timeout: 60000 });
  await page.waitForTimeout(1000);

  // Optional programmatic login if credentials provided
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
        return !!sess?.data?.session?.user?.id;
      }, { email: E2E_EMAIL, password: E2E_PASSWORD });
      log(`Programmatic login: ${ok ? 'success' : 'failed'}`);
    } catch (e) {
      log(`Programmatic login error: ${e}`);
    }
  }

  // Navigate to Community tab
  try {
    await page.getByText('コミュニティ', { exact: true }).first().click({ timeout: 20000 });
  } catch (e) {
    log(`Community tab click failed: ${e}`);
  }

  await page.waitForTimeout(1200);
  // If there are no posts, seed one via client and reload to fetch it
  const hadPost = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (globalThis).__supabase;
    if (!sb) return -1;
    const r = await sb.from('community_posts').select('id').order('createdAt', { ascending: false }).limit(1);
    const count = Array.isArray(r?.data) ? r.data.length : 0;
    if (count > 0) return count;
    const now = new Date().toISOString();
    try { await sb.from('profiles').upsert({ id: 'e2e-bot', displayName: 'E2E ボット', updatedAt: now }); } catch {}
    try {
      await sb.from('community_posts').insert({ authorId: 'e2e-bot', authorName: 'E2E ボット', content: 'E2E seeded ' + now, createdAt: now, updatedAt: now });
    } catch {}
    return 0;
  });
  if (hadPost === 0) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    try { await page.getByText('コミュニティ', { exact: true }).first().click({ timeout: 15000 }); } catch {}
    await page.waitForTimeout(800);
  }
  await ensureAtLeastOnePost(page);
  await page.screenshot({ path: SCREEN_COMMUNITY, fullPage: true });

  // Get latest post id and toggle its replies by clicking testID on comment bar
  const postId = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (globalThis).__supabase;
    if (!sb) return null;
    const { data, error } = await sb
      .from('community_posts')
      .select('id')
      .order('createdAt', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0].id;
  });
  if (!postId) throw new Error('No postId found to test replies');
  log(`Testing replies on postId=${postId}`);

  // Click comment button for that post
  await page.getByTestId(`comment-btn-${postId}`).click({ timeout: 20000 });

  // Insert a reply anonymously (policies must allow insert). This should be picked up by Realtime
  const replyText = `E2E reply ok ${new Date().toLocaleTimeString()}`;
  const inserted = await page.evaluate(async ({ postId, replyText }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (globalThis).__supabase;
    if (!sb) return false;
    const now = new Date().toISOString();
    const sess = await sb.auth.getSession();
    const uid = sess?.data?.session?.user?.id;
    if (uid) {
      try { await sb.from('profiles').upsert({ id: uid, displayName: 'E2E ユーザー', updatedAt: now }); } catch {}
      const { error } = await sb.from('community_comments').insert({
        postId,
        authorId: uid,
        content: replyText,
        createdAt: now,
        updatedAt: now,
      });
      return !error;
    }
    // fallback unauthenticated insert (only if policies allow)
    try { await sb.from('profiles').upsert({ id: 'e2e-bot', displayName: 'E2E ボット', updatedAt: now }); } catch {}
    const { error } = await sb.from('community_comments').insert({
      postId,
      authorId: 'e2e-bot',
      authorName: 'E2E ボット',
      content: replyText,
      createdAt: now,
      updatedAt: now,
    });
    return !error;
  }, { postId, replyText });
  log(`Inserted reply via client: ${inserted}`);

  // Wait until the reply text appears in RepliesList
  await page.getByText(replyText, { exact: false }).waitFor({ timeout: 20000 });
  await page.screenshot({ path: SCREEN_AFTER, fullPage: true });

  writeFileSync(LOGFILE, logs.join('\n'), 'utf8');
  await browser.close();
}

run().catch((e) => {
  log(`FATAL: ${e?.stack || e}`);
  writeFileSync(LOGFILE, logs.join('\n'), 'utf8');
  process.exit(1);
});
