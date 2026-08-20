import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion } from "./reduced";
import { perceptualDelta } from "./png";

// Figure gate. Serves the built dist over a local origin, navigates to the page, and drives the
// spectrum figure across its claimed axis with assertVaries (oracle 5) and asserts the
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

// Structural admissibility: the --pos driver moves the handle but not the static content
// carrying the claim. This assertion reads the rendered pixels directly so a collapsed claim
// (fill the same color as the track) reds regardless of what --pos does.

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

// F3: label-to-position correspondence. A figure whose claim is a named sequence owes one content
// assertion binding each label to its index. Swapping SpectrumFigure's two end labels inverts the
// figure's claim with every existing assertion green — this pins the text at each position.

// Spectrum: the two end labels must read "vibe coding", "organic human code" in order —
// left-to-right, the axis the figure claims.
test("spectrum: end labels bound to positions (vibe coding → organic human code)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const labels = await page.locator(".spectrum .axis-labels span").evaluateAll((els) =>
    els.map((el) => el.textContent?.trim() ?? ""),
  );
  expect(labels).toEqual(["vibe coding", "organic human code"]);
});

// Criterion 8: font application. The computed font-family on body must resolve to IBM Plex Sans at
// weight 600, and on h1/h2 to Outfit — read off the built page, not source. A webfont that fails to
// load renders the fallback stack silently and every other oracle stays green. document.fonts.check
// returns true when no @font-face matches (nothing needs loading), so it cannot see the failure.
// A canvas measurement can: if the webfont never registered, the browser falls back to the generic
// family and both measurements match. Mutation: point the font link at a nonexistent family and
// watch this arm red.

/** Measure whether a named webfont is actually rendering, not just specified in CSS. */
async function isFontRendered(
  page: import("@playwright/test").Page,
  family: string,
  weight: string,
): Promise<boolean> {
  return page.evaluate(
    ({ family, weight }) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const text = "mmmmmmmmmmlli";
      ctx.font = `${weight} 72px "${family}", sans-serif`;
      const w1 = ctx.measureText(text).width;
      ctx.font = `${weight} 72px sans-serif`;
      const w2 = ctx.measureText(text).width;
      return Math.abs(w1 - w2) > 0.1;
    },
    { family, weight },
  );
}

test("font application: body IBM Plex Sans 600, headings Outfit (criterion 8)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const bodyFont = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight };
  });
  console.log(`font application: body fontFamily=${bodyFont.fontFamily} weight=${bodyFont.fontWeight}`);

  expect(bodyFont.fontFamily.toLowerCase()).toContain("ibm plex sans");
  expect(bodyFont.fontWeight).toBe("600");

  const plexRendered = await isFontRendered(page, "IBM Plex Sans", "600");
  console.log(`font application: IBM Plex Sans rendered=${plexRendered}`);
  expect(plexRendered).toBe(true);

  const headingFonts = await page.locator("h1, h2").evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).fontFamily),
  );
  for (const ff of headingFonts) {
    expect(ff.toLowerCase()).toContain("outfit");
  }

  const outfitRendered = await isFontRendered(page, "Outfit", "600");
  console.log(`font application: Outfit rendered=${outfitRendered}`);
  expect(outfitRendered).toBe(true);
});
