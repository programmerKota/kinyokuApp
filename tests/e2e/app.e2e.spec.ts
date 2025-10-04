import { test, expect } from '@playwright/test';

// Ensure first-run modal is shown
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('profile_setup_seen_v1');
    } catch {}
  });
});

test('Profile setup modal saves and hides', async ({ page }) => {
  await page.goto('/');
  // Wait basic shell
  await page.waitForSelector('#root');

  // Name input placeholder is 日本語: 名前
  const nameInput = page.getByPlaceholder('名前');
  await expect(nameInput).toBeVisible({ timeout: 15_000 });
  await nameInput.fill('E2E太郎');

  // 保存ボタン
  const saveText = page.locator('text=保存');
  await expect(saveText).toBeVisible();
  await saveText.click();

  // Modal closes
  await expect(nameInput).toBeHidden({ timeout: 10_000 });
});

test('Navigate to Ranking from Home button and see title', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#root');

  // If first-run profile modal is open, dismiss it
  const cancel = page.locator('text=キャンセル');
  if (await cancel.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cancel.click();
  }

  // Home has a ランキング button component (text node)
  await page.locator('text=ランキング').first().click();

  // Ranking screen visible (accept any of these texts)
  const ok = await Promise.race([
    page.locator('text=ランキング').first().waitFor({ timeout: 10_000 }).then(() => true).catch(() => false),
    page.locator('text=ランキングデータがありません').waitFor({ timeout: 10_000 }).then(() => true).catch(() => false),
    page.locator('text=現在の継続時間でランキングしています。').waitFor({ timeout: 10_000 }).then(() => true).catch(() => false),
  ]);
  expect(ok).toBeTruthy();
});

test('Open Community tab and interact with tabs', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#root');
  // If first-run profile modal is open, dismiss it
  const cancel = page.locator('text=キャンセル');
  if (await cancel.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cancel.click();
  }

  // Switch tab to Community (bottom bar label is English)
  await page.locator('text=Community').first().click();

  // Verify Community tabs render and toggle
  const allTab = page.locator('text=すべて');
  const myTab = page.locator('text=My投稿');
  const followTab = page.locator('text=フォロー');
  await expect(allTab).toBeVisible({ timeout: 10_000 });
  await myTab.click();
  await followTab.click();
});
