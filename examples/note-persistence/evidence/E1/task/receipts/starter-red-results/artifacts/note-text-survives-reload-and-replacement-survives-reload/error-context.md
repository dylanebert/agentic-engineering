# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: note.spec.ts >> text survives reload and replacement survives reload
- Location: tests/note.spec.ts:26:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('textarea#note')
Timeout: 3000ms
Expected: "original
multiline note"
Received: ""

Call log:
  - Expect "toHaveValue" with timeout 3000ms
  - waiting for locator('textarea#note')
    10 × locator resolved to <textarea rows="8" id="note" cols="40"></textarea>
       - unexpected value ""

```

```yaml
- textbox "Your note"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | async function freshPage({ page, context }: { page: import('@playwright/test').Page; context: import('@playwright/test').BrowserContext }) {
  4  |   await context.clearCookies();
  5  |   await page.goto('/');
  6  |   await page.evaluate(() => localStorage.clear());
  7  |   await page.reload();
  8  | }
  9  | 
  10 | test('fresh context has one empty textbox and one Clear button', async ({ page, context }) => {
  11 |   await freshPage({ page, context });
  12 |   await expect(page.locator('textarea#note')).toHaveCount(1);
  13 |   await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(1);
  14 |   await expect(page.locator('textarea#note')).toHaveValue('');
  15 | });
  16 | 
  17 | test('multiline editing and Clear work', async ({ page, context }) => {
  18 |   await freshPage({ page, context });
  19 |   const note = page.locator('textarea#note');
  20 |   await note.fill('first line\nsecond line');
  21 |   await expect(note).toHaveValue('first line\nsecond line');
  22 |   await page.getByRole('button', { name: 'Clear' }).click();
  23 |   await expect(note).toHaveValue('');
  24 | });
  25 | 
  26 | test('text survives reload and replacement survives reload', async ({ page, context }) => {
  27 |   await freshPage({ page, context });
  28 |   const note = page.locator('textarea#note');
  29 |   await note.fill('original\nmultiline note');
  30 |   await page.reload();
> 31 |   await expect(note).toHaveValue('original\nmultiline note');
     |                      ^ Error: expect(locator).toHaveValue(expected) failed
  32 |   await note.fill('replacement only');
  33 |   await page.reload();
  34 |   await expect(note).toHaveValue('replacement only');
  35 | });
  36 | 
  37 | test('Clear survives reload and another Clear/reload remains empty', async ({ page, context }) => {
  38 |   await freshPage({ page, context });
  39 |   const note = page.locator('textarea#note');
  40 |   await note.fill('to be cleared');
  41 |   await page.getByRole('button', { name: 'Clear' }).click();
  42 |   await page.reload();
  43 |   await expect(note).toHaveValue('');
  44 |   await page.getByRole('button', { name: 'Clear' }).click();
  45 |   await page.reload();
  46 |   await expect(note).toHaveValue('');
  47 | });
  48 | 
```