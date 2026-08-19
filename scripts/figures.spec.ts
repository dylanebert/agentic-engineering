import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion } from "./reduced";
import { perceptualDelta } from "./png";

// Figure gate for stage D. Serves the built dist over a local origin, navigates to the page, and
// drives each figure across its claimed axis with assertVaries (oracle 5) and asserts the
// reduced-motion resting state with assertReducedMotion (oracle 6). Runs in the work dir staged
// by figures.ts, next to a built dist/.

const root = __dirname;
const dist = join(root, "dist");
const base = "/agentic-engineering/";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".map": "application/json",
};

let server: Server;
let url: string;

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    let path = new URL(req.url ?? "/", "http://localhost").pathname;
    path = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, "");
    if (path === "" || path.endsWith("/")) path = "index.html";
    let body: Buffer;
    try {
      body = await readFile(join(dist, path));
    } catch {
      path = "index.html";
      body = await readFile(join(dist, path));
    }
    const type = types[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no server port");
  url = `http://127.0.0.1:${address.port}${base}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

// Spectrum: --pos (0-1) drives the handle and fill. Six steps at 0, 0.2, 0.4, 0.6, 0.8, 1.0.
const spectrumDriver: AxisDriver = async (page, step) => {
  await page
    .locator(".spectrum")
    .evaluate((el, s) => el.style.setProperty("--pos", String(s / 5)), step);
};

// Verification: --pos (0-1) drives the highlight along the cost-reach diagonal.
// Three steps at the three point positions: machine (0.2), agent (0.5), human (0.8).
const verificationDriver: AxisDriver = async (page, step) => {
  const positions = [0.2, 0.5, 0.8];
  await page
    .locator(".verification")
    .evaluate((el, p) => el.style.setProperty("--pos", String(p)), positions[step]);
};

// Loop: --pos (0-1, snapped to 0 / 0.5 / 1 = spec / stage / verify) drives the highlight that
// lands on the active stage chip. Three steps at the three stage positions.
const loopDriver: AxisDriver = async (page, step) => {
  const positions = [0, 0.5, 1];
  await page
    .locator(".loop")
    .evaluate((el, p) => el.style.setProperty("--pos", String(p)), positions[step]);
};

// Spec: --pos (0-1, snapped to 0 / 0.5 / 1 = Goal / Stages / Validation) drives the highlight on
// the section the loop's current stage reads from. Same axis as the loop figure.
const specDriver: AxisDriver = async (page, step) => {
  const positions = [0, 0.5, 1];
  await page
    .locator(".spec")
    .evaluate((el, p) => el.style.setProperty("--pos", String(p)), positions[step]);
};

test("spectrum: varies across its axis", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertVaries(page, ".spectrum", spectrumDriver, 6);
  console.log(`spectrum variance: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("spectrum: reduced-motion resting state", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, ".spectrum", spectrumDriver, 3);
  console.log(`spectrum reduced: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("verification: varies across its axis", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertVaries(page, ".verification", verificationDriver, 3);
  console.log(`verification variance: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("verification: reduced-motion resting state", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, ".verification", verificationDriver, 3);
  console.log(`verification reduced: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

// Structural admissibility: the --pos driver moves the highlight but not the static content
// carrying the claim. These assertions read the rendered geometry / pixels directly so a
// collapsed claim (all points at one coordinate, or fill the same color as the track) reds
// regardless of what --pos does.

test("verification: three points strictly ordered along both axes", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const centers = await page
    .locator(".verification .point")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }),
    );
  expect(centers).toHaveLength(3);
  // cost ascending left-to-right: x strictly increasing
  expect(centers[1].x).toBeGreaterThan(centers[0].x);
  expect(centers[2].x).toBeGreaterThan(centers[1].x);
  // reach ascending bottom-to-top: y strictly decreasing (higher reach = smaller y from top)
  expect(centers[1].y).toBeLessThan(centers[0].y);
  expect(centers[2].y).toBeLessThan(centers[1].y);
});

test("spectrum: fill is perceptually distinguishable from the track", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const spectrum = page.locator(".spectrum");
  const track = page.locator(".spectrum .track");
  // Hide the handle so the screenshot isolates fill-vs-track color, not handle position.
  await page.locator(".spectrum .handle").evaluate((el) => (el.style.visibility = "hidden"));
  // pos=0: track entirely unfilled (shows --surface-2)
  await spectrum.evaluate((el) => el.style.setProperty("--pos", "0"));
  await page.waitForTimeout(50);
  const unfilled = await track.screenshot();
  // pos=1: track entirely filled (shows --accent)
  await spectrum.evaluate((el) => el.style.setProperty("--pos", "1"));
  await page.waitForTimeout(50);
  const filled = await track.screenshot();
  // Reuse the JND-grounded delta from png.ts (JND=3 for 8-bit sRGB). If the fill were the same
  // color as the track, meanDelta would be 0 (only border-radius anti-aliasing differs a few
  // edge pixels, which maxDelta would catch falsely). We require the mean per-pixel delta to
  // exceed the JND so the fill is perceptually distinguishable across the whole element.
  const delta = perceptualDelta(unfilled, filled);
  console.log(`spectrum fill-vs-track: meanDelta=${delta.meanDelta.toFixed(2)} maxDelta=${delta.maxDelta} extent=${delta.extent.toFixed(4)}`);
  expect(delta.meanDelta).toBeGreaterThan(3);
});

// --- Stage E: loop and example-spec figures ---

test("loop: varies across its axis", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertVaries(page, ".loop", loopDriver, 3);
  console.log(`loop variance: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("loop: reduced-motion resting state", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, ".loop", loopDriver, 3);
  console.log(`loop reduced: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("loop: three stage chips strictly ordered horizontally", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const centers = await page
    .locator(".loop .chip")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }),
    );
  expect(centers).toHaveLength(3);
  // spec → stage → verify is a left-to-right sequence: x strictly increasing
  expect(centers[1].x).toBeGreaterThan(centers[0].x);
  expect(centers[2].x).toBeGreaterThan(centers[1].x);
});

test("spec: varies across its axis", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertVaries(page, ".spec", specDriver, 3);
  console.log(`spec variance: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("spec: reduced-motion resting state", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, ".spec", specDriver, 3);
  console.log(`spec reduced: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("spec: three section cards strictly ordered vertically", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const centers = await page
    .locator(".spec .card")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }),
    );
  expect(centers).toHaveLength(3);
  // Goal → Stages → Validation is a top-to-bottom walk: y strictly increasing
  expect(centers[1].y).toBeGreaterThan(centers[0].y);
  expect(centers[2].y).toBeGreaterThan(centers[1].y);
});

test("spec: highlighted card is perceptually distinguishable from an unhighlighted card", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const spec = page.locator(".spec");
  const card = page.locator(".spec .card").first();
  // Same card, two --pos states: pos=0 highlights card 0 (accent tint behind it), pos=0.5 moves the
  // highlight off it (base surface behind). Same text in both, so the delta isolates the highlight
  // color vs the base surface — the analog of the spectrum's fill-vs-track read. If the highlight
  // were the same color as the base, meanDelta would be ~0 (only border anti-aliasing differs).
  await spec.evaluate((el) => el.style.setProperty("--pos", "0"));
  await page.waitForTimeout(50);
  const highlighted = await card.screenshot();
  await spec.evaluate((el) => el.style.setProperty("--pos", "0.5"));
  await page.waitForTimeout(50);
  const unhighlighted = await card.screenshot();
  const delta = perceptualDelta(highlighted, unhighlighted);
  console.log(`spec highlight-vs-base: meanDelta=${delta.meanDelta.toFixed(2)} maxDelta=${delta.maxDelta} extent=${delta.extent.toFixed(4)}`);
  expect(delta.meanDelta).toBeGreaterThan(3);
});
