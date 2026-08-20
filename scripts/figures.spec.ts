import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion } from "./reduced";
import { perceptualDelta } from "./png";

// Figure gate. Serves the built dist over a local origin, navigates to the page, and asserts
// seven things — four about the spectrum figure, three about the page-wide morph it drives
// (variance, reduced-motion, contrast sweep), plus the applied type read off the built page
// (criterion 8). The morph arms (oracles 5, 5b, 6) read the rendered page at three sampled
// positions (0 = vibe, 0.5 = kex, 1 = win98); the observation channel is a canvas/pixel read of
// the rendered page (screenshot → perceptualDelta), never a CSS-variable read — a vacuous
// observation channel is the failure H paid for. The contrast-sweep arm (criterion 12) sweeps
// --pos in 0.05 steps and asserts WCAG body color-vs-bg contrast ≥ 4.5 — the only instrument
// that samples interior positions. Runs in the work dir staged by figures.ts, next to a built dist/.

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

// Page-wide morph driver: sets --pos on :root (document.documentElement) so the entire page
// restyles, and mirrors color-scheme so UA surfaces match a real drag. Three sampled positions:
// 0 = vibe, 0.5 = kex, 1 = win98.
const morphDriver: AxisDriver = async (page, step) => {
  await page.evaluate((s) => {
    const p = s / 2;
    document.documentElement.style.setProperty("--pos", String(p));
    document.documentElement.style.colorScheme = p < 0.25 ? "dark" : "light";
  }, step);
};

// --- Oracle 5 (page-scale variance) ---

test("page: varies across the morph axis (whole page)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  // The observation channel is a pixel read of the rendered page (body screenshot), not a
  // CSS-variable read — getComputedStyle on --pos would report the value the CSS names, not
  // the dress that rendered, so a broken morph (all endpoints identical) would pass vacuously.
  const result = await assertVaries(page, "body", morphDriver, 3);
  console.log(`page variance: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

// --- Oracle 6 (reduced-motion resting state, page-scale) ---

test("page: reduced-motion resting state at each morph position", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "body", morphDriver, 3);
  console.log(`page reduced: pass=${result.pass} steps=${result.steps} failures=${result.failures.length}`);
  for (const f of result.failures) console.log(`  ${f.reason}`);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

// --- Figure-level: fill distinguishable from track ---

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

// --- Oracle 5b (end labels bound to positions) ---

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

// --- Oracle: contrast sweep (criterion 12 / WCAG) ---

// The only instrument that samples interior positions. Sweeps --pos in 0.05 steps from 0 to 1
// and asserts WCAG contrast(body color, body background-color) ≥ 4.5 at every step. The vibe→kex
// segment interpolates a light-on-dark pair through a dark-on-light pair, so bg and ink converge
// mid-segment without the snap fix — this arm reds at ~1:1 around pos 0.25 before the fix and
// greens after. Mutation: replace snap1 with t1 in the --bg/--ink/--text-dim/--text-muted
// definitions and watch this arm red at pos 0.25.

test("page: WCAG contrast ≥ 4.5 across the morph axis (0.05 sweep)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const failures: { pos: number; contrast: number }[] = [];

  for (let i = 0; i <= 20; i++) {
    const pos = i / 20; // 0, 0.05, ..., 1.0
    await page.evaluate((p) => {
      document.documentElement.style.setProperty("--pos", p.toFixed(4));
      document.documentElement.style.colorScheme = p < 0.25 ? "dark" : "light";
    }, pos);
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
        ),
    );

    const contrast = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      // getComputedStyle may return color(srgb ...), oklab(...), or rgb() depending on
      // the browser's internal representation of the color-mix result. Handle all three.
      function parseColor(s: string): [number, number, number] {
        // rgb(r, g, b) or rgba(r, g, b, a) — values 0-255
        let m = s.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
          return [parts[0], parts[1], parts[2]];
        }
        // color(srgb r g b) — values 0-1, optional / alpha
        m = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\)/);
        if (m) {
          return [parseFloat(m[1]) * 255, parseFloat(m[2]) * 255, parseFloat(m[3]) * 255];
        }
        // oklab(L a b) — L 0-1, a/b unbounded, optional / alpha
        m = s.match(/oklab\(\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)(?:\s*\/\s*[\d.]+)?\s*\)/);
        if (m) {
          const L = parseFloat(m[1]), a = parseFloat(m[2]), b = parseFloat(m[3]);
          const l_ = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
          const m_ = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
          const s_ = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
          let r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
          let g = -1.2684380087 * l_ + 2.6097574051 * m_ - 0.3413193965 * s_;
          let bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_;
          const gamma = (c: number) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
          r = Math.max(0, Math.min(1, gamma(r)));
          g = Math.max(0, Math.min(1, gamma(g)));
          bl = Math.max(0, Math.min(1, gamma(bl)));
          return [r * 255, g * 255, bl * 255];
        }
        // #rrggbb
        const h = s.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (h) {
          return [parseInt(h[1], 16), parseInt(h[2], 16), parseInt(h[3], 16)];
        }
        return [0, 0, 0];
      }
      function luminance(r: number, g: number, b: number): number {
        function lin(c: number): number {
          c /= 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        }
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      }
      const [r1, g1, b1] = parseColor(cs.color);
      const [r2, g2, b2] = parseColor(cs.backgroundColor);
      const l1 = luminance(r1, g1, b1);
      const l2 = luminance(r2, g2, b2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    });

    console.log(`contrast sweep: pos=${pos.toFixed(2)} contrast=${contrast.toFixed(2)}`);
    if (contrast < 4.5) {
      failures.push({ pos, contrast });
    }
  }

  for (const f of failures) console.log(`  contrast FAIL: pos=${f.pos.toFixed(2)} contrast=${f.contrast.toFixed(2)}`);
  expect(failures).toEqual([]);
});

// --- Oracle 5b (end descriptors bound to their ends) ---

// The morph adds one descriptor per end naming what that end means. Permuting them inverts the
// claim — the vibe descriptor must sit at pos=0 (left) and the organic descriptor at pos=1 (right).
// Mutation: swap the two descriptor spans and watch this arm red.

test("spectrum: end descriptors bound to their ends", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const descriptors = await page.locator(".spectrum .descriptors span").evaluateAll((els) =>
    els.map((el) => el.textContent?.trim() ?? ""),
  );
  expect(descriptors).toEqual([
    "the color a model picks by default",
    "every line written by hand",
  ]);
});

// --- Criterion 8 (font application) ---

// Font application, shipped at H: the computed font-family on body resolves to IBM Plex Sans at
// weight 600, and on h1/h2 to Outfit, read off the built page. A webfont that fails to load
// renders the fallback stack silently and every other oracle stays green — this is the only
// instrument that can see it. Mutation: point index.html's font <link> at a nonexistent family
// and watch it red (H moved loading off CSS @import onto a preconnect + <link>, so the mutation
// lives there). getComputedStyle alone cannot see this — the CSS still names the family after
// the load fails, so the arm measures the family on a canvas against a sans-serif control:
// identical widths mean the fallback rendered. Both directions observed at H.

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
