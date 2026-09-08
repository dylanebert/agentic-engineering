# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: setup.spec.ts >> supplied editing and Clear; qualification only
- Location: tests/setup.spec.ts:3:1

# Error details

```
Error: deliberate setup qualification failure; not an E1 defect

expect(received).toBe(expected) // Object.is equality

Expected: "forced failure"
Received: "observed"
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Note" [level=1] [ref=e2]
  - text: Your note
  - textbox "Your note" [ref=e3]
  - button "Clear" [active] [ref=e4]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('supplied editing and Clear; qualification only', async ({ page, browser }) => {
  4  |   console.log('browser version', browser.version());
  5  |   const response = await page.goto('/');
  6  |   expect(response?.status()).toBe(200);
  7  |   const note = page.getByRole('textbox');
  8  |   await expect(note).toHaveCount(1);
  9  |   await expect(page.getByRole('button', { name: 'Clear', exact: true })).toHaveCount(1);
  10 |   await expect(note).toHaveValue('');
  11 |   await note.fill('Qualification line one\nQualification line two');
  12 |   await expect(note).toHaveValue('Qualification line one\nQualification line two');
  13 |   await page.getByRole('button', { name: 'Clear', exact: true }).click();
  14 |   await expect(note).toHaveValue('');
  15 |   expect((await page.request.get('/package.json')).status()).toBe(404);
  16 |   if (process.env.QUALIFICATION_FAILURE === '1') {
> 17 |     expect('observed', 'deliberate setup qualification failure; not an E1 defect').toBe('forced failure');
     |                                                                                    ^ Error: deliberate setup qualification failure; not an E1 defect
  18 |   }
  19 | });
  20 | 
```