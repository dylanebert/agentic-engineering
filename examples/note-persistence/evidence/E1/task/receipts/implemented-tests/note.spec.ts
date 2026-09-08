import { test, expect } from '@playwright/test';

async function freshPage({ page, context }: { page: import('@playwright/test').Page; context: import('@playwright/test').BrowserContext }) {
  await context.clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test('fresh context has one empty textbox and one Clear button', async ({ page, context }) => {
  await freshPage({ page, context });
  await expect(page.locator('textarea#note')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(1);
  await expect(page.locator('textarea#note')).toHaveValue('');
});

test('multiline editing and Clear work', async ({ page, context }) => {
  await freshPage({ page, context });
  const note = page.locator('textarea#note');
  await note.fill('first line\nsecond line');
  await expect(note).toHaveValue('first line\nsecond line');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(note).toHaveValue('');
});

test('text survives reload and replacement survives reload', async ({ page, context }) => {
  await freshPage({ page, context });
  const note = page.locator('textarea#note');
  await note.fill('original\nmultiline note');
  await page.reload();
  await expect(note).toHaveValue('original\nmultiline note');
  await note.fill('replacement only');
  await page.reload();
  await expect(note).toHaveValue('replacement only');
});

test('Clear survives reload and another Clear/reload remains empty', async ({ page, context }) => {
  await freshPage({ page, context });
  const note = page.locator('textarea#note');
  await note.fill('to be cleared');
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.reload();
  await expect(note).toHaveValue('');
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.reload();
  await expect(note).toHaveValue('');
});
