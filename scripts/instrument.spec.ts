import { createServer, type Server } from "node:http";
import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion } from "./reduced";
import { perceptualDelta } from "./png";

// Self-test for the figure instrument (variance + reduced-motion). Serves synthetic fixtures and
// drives them through the reusable harnesses. No figures exist yet (they land in D and E); this
// proves the instrument discriminates now, per oracle 5 / coding.md (a check is evidence only if
// you have seen it fail).
//
// Fixtures:
//   /hue            — a figure whose background hue rotates 90° per --step (the real shape).
//   /subperceptual  — a figure whose red channel steps by 1 RGB unit per --step: bytes differ,
//                     perception does not. Reds the perceptual floor (fix 2); would have passed
//                     the old Buffer.equals check.
//   /blank          — a figure that never draws (transparent). Reds the non-triviality guard
//                     (fix 4) even though it is perfectly stable.

const hueHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure {
        width: 200px;
        height: 200px;
        background: hsl(calc(var(--step, 0) * 90deg), 70%, 50%);
        transition: background 0.3s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .figure { transition: none; }
      }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

const subPerceptualHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure {
        width: 200px;
        height: 200px;
        /* 1-RGB-unit red step per --step: every state differs in bytes, none perceptibly. */
        background: rgb(calc(100 + var(--step, 0)), 100, 100);
      }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

const blankHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure { width: 200px; height: 200px; }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

const fixtures: Record<string, string> = {
  "/hue": hueHtml,
  "/subperceptual": subPerceptualHtml,
  "/blank": blankHtml,
};

let server: Server;
let url: string;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const body = fixtures[path] ?? hueHtml;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no server port");
  url = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

// The axis driver: sets --step on the figure. To pin (mutation run), set the second arg to 0
// instead of step — every state renders the same hue, so the variance harness reds.
const driver: AxisDriver = async (page, step) => {
  await page.locator("#fig").evaluate((el, s) => el.style.setProperty("--step", String(s)), step);
};

async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
      ),
  );
}

async function capture(page: Page, step: number): Promise<Buffer> {
  await driver(page, step);
  await settle(page);
  return page.locator("#fig").screenshot();
}

const STEPS = 4;

test("variance: figure varies across its axis", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  const result = await assertVaries(page, "#fig", driver, STEPS);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("reduced-motion: figure renders fully drawn at every state", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "#fig", driver, STEPS);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("variance: sub-perceptual steps red at the perceptual floor (would pass byte-identity)", async ({ page }) => {
  await page.goto(url + "/subperceptual", { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const a = await capture(page, 0);
  const b = await capture(page, 1);
  // OLD check (byte-identity, Buffer.equals): bytes differ → would have PASSED (green).
  expect(a.equals(b)).toBe(false);
  // NEW check (perceptual delta): 1-RGB-unit steps are sub-perceptual → REDS.
  const delta = perceptualDelta(a, b);
  console.log(
    `sub-perceptual old-vs-new: byte-identity=${a.equals(b)} (old would pass); ` +
      `perceptual meanDelta=${delta.meanDelta} maxDelta=${delta.maxDelta} extent=${delta.extent} (new reds)`,
  );
  expect(delta.maxDelta).toBeLessThan(3);
  expect(delta.extent).toBe(0);
  const result = await assertVaries(page, "#fig", driver, STEPS);
  expect(result.pass).toBe(false);
  expect(result.failures.length).toBeGreaterThan(0);
  expect(result.failures[0].meanDelta).toBe(delta.meanDelta);
  expect(result.failures[0].extent).toBe(delta.extent);
});

test("reduced-motion: blank element reds (never drew is not 'fully drawn')", async ({ page }) => {
  await page.goto(url + "/blank", { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "#fig", driver, 1);
  expect(result.pass).toBe(false);
  expect(result.failures.some((f) => /trivial|blank/i.test(f.reason))).toBe(true);
});

test("guards: assertVaries throws for <2 steps", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  await expect(assertVaries(page, "#fig", driver, 0)).rejects.toThrow();
  await expect(assertVaries(page, "#fig", driver, 1)).rejects.toThrow();
});

test("guards: assertReducedMotion throws for <1 step", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  await expect(assertReducedMotion(page, "#fig", driver, 0)).rejects.toThrow();
});
