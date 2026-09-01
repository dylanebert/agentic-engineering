import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion, settleToRest } from "./reduced";
import { perceptualDelta } from "./png";

// Figure gate. Serves the built dist over a local origin, navigates to the page, and asserts
// seventeen things — four about the spectrum figure (fill distinguishable, end labels bound, end
// descriptors bound, referent vocabulary), four about the page-wide morph it drives (variance,
// reduced-motion, contrast sweep, font application), two added at K (vibe vocabulary and
// reachability), one added at S2 (the server's missing-asset 404 contract), one added at
// S2's repair round (production-path reachability: real slider input, not a self-set driver), and
// five S4/S5 neutral-template arms (hierarchy, portable readable measure, selected measure,
// production strong emphasis and rhythm, non-interference).
// The reachability claim K shipped drove --pos and toggled the classes itself, then asserted the
// class set — circular about the production path; the repair round keeps that coverage under a
// driver-parity name and adds the arm that reads classes after real keyboard/pointer input. The
// referent-vocabulary arm was widened to a three-way read at K but is the same arm, not a new
// one. The morph arms (oracles 5, 6) read
// the rendered page at three sampled positions (0 = vibe, 0.5 = kex, 1 = win98); the observation
// channel is a canvas/pixel read of the rendered page (screenshot → perceptualDelta), never a
// CSS-variable read — a vacuous observation channel is the failure H paid for. The contrast-sweep
// arm (criterion 18) sweeps --pos in 0.05 steps and asserts WCAG contrast ≥ 4.5 across three
// channels (text-dim, text-muted, heading-text) — the only instrument that samples interior
// positions. Runs in the work dir staged by figures.ts, next to a built dist/.

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
      // 404 on missing assets — no SPA fallback. Serving index.html for a missing JS/CSS/font
      // request would feed HTML to a script or stylesheet tag; the page still renders its text
      // (inline HTML) and every arm can stay green while the figure's own asset silently never
      // loaded. The equivalence server behaves the same way for missing assets, and the arm
      // below pins that missing-asset behavior here. (This server does not claim parity with
      // the equivalence server beyond missing assets; the equivalence server additionally
      // rejects path traversal, which is out of scope for this gate.)
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end(`missing asset: ${path}`);
      return;
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
// restyles, mirrors color-scheme so UA surfaces match a real drag, and toggles the vibe / win98
// classes at the same thresholds setPos uses. The type/layout vocabulary is flat per class
// (each dress owns its literal type/layout block), so the class toggle carries it; the color,
// border, radius, and accent channels stay continuously interpolated through --t1/--t2. Three
// sampled positions: 0 = vibe, 0.5 = kex, 1 = win98.
const morphDriver: AxisDriver = async (page, step) => {
  await page.evaluate((s) => {
    const p = s / 2;
    document.documentElement.style.setProperty("--pos", String(p));
    document.documentElement.style.colorScheme = p <= 0.25 ? "dark" : "light";
    document.documentElement.classList.toggle("vibe", p <= 0.25);
    document.documentElement.classList.toggle("win98", p > 0.75);
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
  // Condition read, not a fixed wait: each driven state must render and reach rest (two
  // consecutive rAF-separated frames byte-identical) before the screenshot is taken. A fixed
  // 50ms wait raced the repaint; the settle reds on expiry instead of sampling a stale frame.
  // pos=0: track entirely unfilled (shows --surface-2)
  await spectrum.evaluate((el) => el.style.setProperty("--pos", "0"));
  await settleToRest(page, ".spectrum .track");
  const unfilled = await track.screenshot();
  // pos=1: track entirely filled (shows --accent)
  await spectrum.evaluate((el) => el.style.setProperty("--pos", "1"));
  await settleToRest(page, ".spectrum .track");
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

// --- Oracle: contrast sweep (criterion 18 / WCAG) ---

// The only instrument that samples interior positions. Sweeps --pos in 0.05 steps from 0 to 1
// and asserts WCAG contrast ≥ 4.5 at every step across three channels: body text-dim vs its
// effective background (walking up the tree to the nearest opaque ancestor — paragraphs render
// on .section's white, not body's bg), text-muted (.meta) vs its effective background, and
// heading text vs its effective background. The vibe→kex segment interpolates a light-on-dark pair through
// a dark-on-light pair, so bg and ink converge mid-segment without the snap fix — this arm
// reds at ~1:1 around pos 0.25 before the fix and greens after. The heading channel catches
// the win98 caption: white on solid #000080 is ~16:1, but the prior gradient's bottom stop
// #1084d0 was 4.01:1 — under the floor and unseen because the sweep probed .meta, not the
// heading. Mutation: replace snap1 with t1 in the --bg/--ink/--text-dim/--text-muted
// definitions and watch this arm red at pos 0.25; or restore the gradient heading-bg and watch
// the heading channel red at pos 1.

test("page: WCAG contrast ≥ 4.5 across the morph axis (0.05 sweep)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const failures: { pos: number; contrast: number; channel: string }[] = [];

  for (let i = 0; i <= 20; i++) {
    const pos = i / 20; // 0, 0.05, ..., 1.0
    await page.evaluate((p) => {
      document.documentElement.style.setProperty("--pos", p.toFixed(4));
      document.documentElement.style.colorScheme = p <= 0.25 ? "dark" : "light";
      document.documentElement.classList.toggle("vibe", p <= 0.25);
      document.documentElement.classList.toggle("win98", p > 0.75);
    }, pos);
    // Wait for the style recalc to settle before reading. The section's background is now
    // three-way: translucent (alpha 0.1) at vibe, transparent at kex, opaque at win98.
    // A forced reflow alone does not recalculate custom-property dependents in Chromium;
    // polling a dependent color-mix result (the section's computed backgroundColor alpha)
    // ensures the sweep samples the state it claims, not a lagged one. Polling the root
    // --snap1/--snap2 @property values is insufficient — they are inputs, not dependents,
    // and Chromium recalculates them before the color-mix results (J's lesson: snap1 is not
    // the dependent). The expected section-bg alpha is 0.1 at pos <= 0.25 (vibe glass),
    // 0 for 0.25 < pos <= 0.75 (kex transparent), 1 for pos > 0.75 (win98 opaque white).
    await page.waitForFunction((p) => {
      const section = document.querySelector('.section');
      if (!section) return false;
      const bg = getComputedStyle(section).backgroundColor;
      const expectedAlpha = p <= 0.25 ? 0.1 : p > 0.75 ? 1 : 0;
      let actualAlpha: number;
      if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') actualAlpha = 0;
      else {
        let m = bg.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(',').map((x: string) => parseFloat(x.trim()));
          actualAlpha = parts.length === 4 ? parts[3] : 1;
        } else {
          m = bg.match(/color\(srgb\s+[\d.]+\s+[\d.]+\s+[\d.]+(?:\s*\/\s*([\d.]+))?\)/);
          if (m) actualAlpha = m[1] ? parseFloat(m[1]) : 1;
          else actualAlpha = -1;
        }
      }
      return Math.abs(actualAlpha - expectedAlpha) < 0.02;
    }, pos);

    const contrasts = await page.evaluate(() => {
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
      function contrast(fg: string, bg: string): number {
        const [r1, g1, b1] = parseColor(fg);
        const [r2, g2, b2] = parseColor(bg);
        const l1 = luminance(r1, g1, b1);
        const l2 = luminance(r2, g2, b2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }
      // Parse the alpha from a color string to detect transparent backgrounds.
      function parseAlpha(s: string): number {
        if (s === 'transparent') return 0;
        let m = s.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
          return parts.length === 4 ? parts[3] : 1;
        }
        m = s.match(/color\(srgb\s+[\d.]+\s+[\d.]+\s+[\d.]+(?:\s*\/\s*([\d.]+))?\)/);
        if (m) return m[1] ? parseFloat(m[1]) : 1;
        // oklab(L a b / alpha) — getComputedStyle may return color-mix results in this format.
        m = s.match(/oklab\(\s*[\d.-]+\s+[\d.-]+\s+[\d.-]+(?:\s*\/\s*([\d.]+))?\s*\)/);
        if (m) return m[1] ? parseFloat(m[1]) : 1;
        return 1;
      }
      // Walk up the tree alpha-compositing each layer's background over the accumulated
      // result, terminating at an opaque ancestor (or falling back to the body/canvas).
      // Translucent layers (e.g. the vibe glass surface at rgba(255,255,255,0.1)) are composited,
      // not skipped — the sweep measures against the ground the text actually renders on, which
      // is the composited stack, not the nearest opaque ancestor. Skipping the glass surface reads
      // the body's darker --vibe-bg, inflating contrast above the composited truth.
      function effectiveBg(el: Element): string {
        const layers: { r: number; g: number; b: number; a: number }[] = [];
        let current: Element | null = el;
        while (current) {
          const bg = getComputedStyle(current).backgroundColor;
          const [r, g, b] = parseColor(bg);
          const a = parseAlpha(bg);
          layers.push({ r, g, b, a });
          if (a >= 0.999) break;
          current = current.parentElement;
        }
        // Fall back to body, then canvas (white) if no opaque ancestor was found.
        if (layers.length === 0 || layers[layers.length - 1].a < 0.999) {
          const bodyBg = getComputedStyle(document.body).backgroundColor;
          const [br, bg2, bb] = parseColor(bodyBg);
          const ba = parseAlpha(bodyBg);
          layers.push({ r: br, g: bg2, b: bb, a: ba });
          if (ba < 0.999) {
            layers.push({ r: 255, g: 255, b: 255, a: 1 });
          }
        }
        // Composite from the bottom (farthest from viewer) upward.
        let r = 0, g = 0, b = 0, a = 0;
        for (let i = layers.length - 1; i >= 0; i--) {
          const layer = layers[i];
          const newA = layer.a + a * (1 - layer.a);
          if (newA > 0) {
            r = (layer.r * layer.a + r * a * (1 - layer.a)) / newA;
            g = (layer.g * layer.a + g * a * (1 - layer.a)) / newA;
            b = (layer.b * layer.a + b * a * (1 - layer.a)) / newA;
          }
          a = newA;
        }
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      }
      // text-dim: paragraph text colour vs the paragraph's effective background. Above the
      // snap, paragraphs render on .section's opaque white, not body's background — measuring
      // against body would pass vacuously if the client area went dark (SHOULD-FIX 5).
      const pEl = document.querySelector(".section p")!;
      const pCs = getComputedStyle(pEl);
      const dimContrast = contrast(pCs.color, effectiveBg(pEl));
      // text-muted: .meta text colour vs .meta's effective background.
      const metaEl = document.querySelector(".meta")!;
      const metaCs = getComputedStyle(metaEl);
      const mutedContrast = contrast(metaCs.color, effectiveBg(metaEl));
      // heading: the section h2's text colour vs its effective background. At kex (snap2=0)
      // the heading bg is transparent, so the effective bg is the section or page bg. At
      // win98 (snap2=1) the heading bg is solid #000080. This channel catches the caption
      // contrast the prior sweep missed (white on #1084d0 was 4.01:1).
      const headingEl = document.querySelector(".section h2")!;
      const headingCs = getComputedStyle(headingEl);
      const headingContrast = contrast(headingCs.color, effectiveBg(headingEl));
      return { dim: dimContrast, muted: mutedContrast, heading: headingContrast };
    }, pos);

    console.log(`contrast sweep: pos=${pos.toFixed(2)} dim=${contrasts.dim.toFixed(2)} muted=${contrasts.muted.toFixed(2)} heading=${contrasts.heading.toFixed(2)}`);
    if (contrasts.dim < 4.5) {
      failures.push({ pos, contrast: contrasts.dim, channel: "text-dim" });
    }
    if (contrasts.muted < 4.5) {
      failures.push({ pos, contrast: contrasts.muted, channel: "text-muted" });
    }
    if (contrasts.heading < 4.5) {
      failures.push({ pos, contrast: contrasts.heading, channel: "heading-text" });
    }
  }

  for (const f of failures) console.log(`  contrast FAIL: pos=${f.pos.toFixed(2)} channel=${f.channel} contrast=${f.contrast.toFixed(2)}`);
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

// --- Criterion 8 (font application, per-position) ---

// Font application, shipped at H: the computed font-family on body resolves to IBM Plex Sans at
// the neutral treatment's regular weight, and on h1/h2 to Outfit, read off the built page. A
// webfont that fails to load renders the fallback stack silently and every other oracle stays green
// — this is the only instrument that can see it. getComputedStyle alone cannot see this — the CSS
// still names the family after the load fails, so the arm measures the family on a canvas against a
// sans-serif control: identical widths mean the fallback rendered. Both directions observed at H.
//
// At J the arm widens from a fixed read at rest to a per-position read at all three sampled
// positions (0 = vibe, 0.5 = kex, 1 = win98), since the morph now carries a type channel: at
// pos=1 the body and heading faces must resolve to the win98 stack (Tahoma), not the kex stack.
//
// At K the arm moves by name: until K it pinned IBM Plex Sans for every position below 0.75 —
// that green floor was the defect (criterion 19: the left end rendered kex's face wearing a purple
// palette). Now at pos=0 the body and heading faces must resolve to Inter (the LLM-default face),
// proven through isFontRendered, not getComputedStyle. A gate can hold a defect in place.

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

test("font application: per-position at vibe, kex, win98 (criterion 8)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  for (const p of [0, 0.5, 1]) {
    await page.evaluate((pos) => {
      document.documentElement.style.setProperty("--pos", String(pos));
      document.documentElement.style.colorScheme = pos <= 0.25 ? "dark" : "light";
      document.documentElement.classList.toggle("vibe", pos <= 0.25);
      document.documentElement.classList.toggle("win98", pos > 0.75);
    }, p);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
        ),
    );

    const bodyFont = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return { fontFamily: cs.fontFamily, fontWeight: cs.fontWeight };
    });
    console.log(`font application (pos=${p}): body fontFamily=${bodyFont.fontFamily} weight=${bodyFont.fontWeight}`);

    if (p === 0) {
      // Vibe: Inter 400 body, Inter 700 headings. Until K this arm pinned IBM Plex Sans for
      // every position below 0.75 — that green floor was the defect (criterion 19: the left
      // end rendered kex's own face wearing a purple palette). isFontRendered proves the face
      // actually rendered, not just that CSS names it — getComputedStyle is vacuous here (H's
      // lesson). On a seat without Inter the arm reds, which is the correct signal.
      expect(bodyFont.fontFamily.toLowerCase()).toContain("inter");
      expect(bodyFont.fontWeight).toBe("400");

      const interRendered = await isFontRendered(page, "Inter", "400");
      console.log(`font application (pos=${p}): Inter rendered=${interRendered}`);
      expect(interRendered).toBe(true);

      const headingFonts = await page.locator("h1, h2").evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).fontFamily),
      );
      for (const ff of headingFonts) {
        expect(ff.toLowerCase()).toContain("inter");
      }

      const headingInterRendered = await isFontRendered(page, "Inter", "700");
      console.log(`font application (pos=${p}): Inter (heading weight) rendered=${headingInterRendered}`);
      expect(headingInterRendered).toBe(true);
    } else if (p < 0.75) {
      // Kex: IBM Plex Sans 400 body, Outfit headings
      expect(bodyFont.fontFamily.toLowerCase()).toContain("ibm plex sans");
      expect(bodyFont.fontWeight).toBe("400");

      const plexRendered = await isFontRendered(page, "IBM Plex Sans", "400");
      console.log(`font application (pos=${p}): IBM Plex Sans rendered=${plexRendered}`);
      expect(plexRendered).toBe(true);

      const headingFonts = await page.locator("h1, h2").evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).fontFamily),
      );
      for (const ff of headingFonts) {
        expect(ff.toLowerCase()).toContain("outfit");
      }

      const outfitRendered = await isFontRendered(page, "Outfit", "600");
      console.log(`font application (pos=${p}): Outfit rendered=${outfitRendered}`);
      expect(outfitRendered).toBe(true);
    } else {
      // Win98: Tahoma body and headings (the type channel — the whole point of stage J).
      // isFontRendered proves the face actually rendered, not just that CSS names it —
      // getComputedStyle is vacuous here (H's lesson). On a seat without Tahoma (iOS, Android,
      // most Linux CI) the arm reds, which is the correct signal: the intended face did not
      // render. The platform gap is recorded in the stage report.
      expect(bodyFont.fontFamily.toLowerCase()).toContain("tahoma");
      expect(bodyFont.fontWeight).toBe("400");

      const tahomaRendered = await isFontRendered(page, "Tahoma", "400");
      console.log(`font application (pos=${p}): Tahoma rendered=${tahomaRendered}`);
      expect(tahomaRendered).toBe(true);

      const headingFonts = await page.locator("h1, h2").evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).fontFamily),
      );
      for (const ff of headingFonts) {
        expect(ff.toLowerCase()).toContain("tahoma");
      }

      const headingTahomaRendered = await isFontRendered(page, "Tahoma", "700");
      console.log(`font application (pos=${p}): Tahoma (heading weight) rendered=${headingTahomaRendered}`);
      expect(headingTahomaRendered).toBe(true);
    }
  }
});

// --- Criterion 17 (referent-vocabulary arm, widened to three-way at K) ---

// The arm that would have red on I's shipped right end. At J it read only pos=0.5 and pos=1, so it
// was structurally blind to a thin left end — an instrument written against the instance rather
// than the claim. At K it becomes a three-way read: each endpoint's rendered faces must differ
// from kex's AND from each other's, measured on the canvas width-measurement channel
// (getComputedStyle reports the family the CSS names, not the family that rendered — the arm must
// be immune to that). Mutation: point the pos=0 family at kex's and at win98's in turn and watch
// the arm red. A family named in a token set that no rule applies is the vacuity this arm catches.

test("referent vocabulary: three-way face read at vibe, kex, win98 (criterion 17)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // Helper: set pos and classes, wait for fonts and style to settle, measure body and heading
  // font widths via the canvas channel.
  async function measureAt(pos: number, label: string) {
    await page.evaluate((p) => {
      document.documentElement.style.setProperty("--pos", String(p));
      document.documentElement.style.colorScheme = p <= 0.25 ? "dark" : "light";
      document.documentElement.classList.toggle("vibe", p <= 0.25);
      document.documentElement.classList.toggle("win98", p > 0.75);
    }, pos);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
    );
    const result = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const text = "mmmmmmmmmmlli";
      const bodyCs = getComputedStyle(document.body);
      ctx.font = `${bodyCs.fontWeight} 72px ${bodyCs.fontFamily}`;
      const bodyWidth = ctx.measureText(text).width;
      const h1 = document.querySelector("h1")!;
      const h1Cs = getComputedStyle(h1);
      ctx.font = `${h1Cs.fontWeight} 72px ${h1Cs.fontFamily}`;
      const headingWidth = ctx.measureText(text).width;
      return { bodyWidth, headingWidth, bodyFamily: bodyCs.fontFamily, headingFamily: h1Cs.fontFamily };
    });
    console.log(`criterion 17 ${label}: body family="${result.bodyFamily}" width=${result.bodyWidth.toFixed(2)} | heading family="${result.headingFamily}" width=${result.headingWidth.toFixed(2)}`);
    return result;
  }

  const vibe = await measureAt(0, "vibe (pos=0)");
  const kex = await measureAt(0.5, "kex (pos=0.5)");
  const win98 = await measureAt(1, "win98 (pos=1)");

  const vibeKexBody = Math.abs(vibe.bodyWidth - kex.bodyWidth);
  const vibeKexHeading = Math.abs(vibe.headingWidth - kex.headingWidth);
  const vibeWin98Body = Math.abs(vibe.bodyWidth - win98.bodyWidth);
  const vibeWin98Heading = Math.abs(vibe.headingWidth - win98.headingWidth);
  const kexWin98Body = Math.abs(kex.bodyWidth - win98.bodyWidth);
  const kexWin98Heading = Math.abs(kex.headingWidth - win98.headingWidth);

  console.log(`criterion 17: vibe-kex body=${vibeKexBody.toFixed(2)} heading=${vibeKexHeading.toFixed(2)} | vibe-win98 body=${vibeWin98Body.toFixed(2)} heading=${vibeWin98Heading.toFixed(2)} | kex-win98 body=${kexWin98Body.toFixed(2)} heading=${kexWin98Heading.toFixed(2)}`);

  // Each endpoint's faces must differ from kex's and from each other's.
  expect(vibeKexBody).toBeGreaterThan(0.1);
  expect(vibeKexHeading).toBeGreaterThan(0.1);
  expect(vibeWin98Body).toBeGreaterThan(0.1);
  expect(vibeWin98Heading).toBeGreaterThan(0.1);
  expect(kexWin98Body).toBeGreaterThan(0.1);
  expect(kexWin98Heading).toBeGreaterThan(0.1);
});

// --- Criterion 20 (vibe-vocabulary arm, owed at K) ---

// Criterion 17's mirror, plus the channels type alone does not cover. Reads the channels that
// make the low end "slop" rather than merely purple, each at pos=0 against pos=0.5, each
// mutation-proven: computed text-align is center on body copy, heading letter-spacing is
// negative, the glass surface's backdrop-filter is non-none with a translucent 1px border, a
// colored (non-neutral) box-shadow is present, and the border radius exceeds kex's. A token
// named in the vibe set and applied by no rule is the vacuity this arm exists to catch.
// Mutations (one per channel, matching font-application's style):
//   text-align: remove `text-align: center` from html.vibe .page → vibe.textAlign !== "center" reds;
//   letter-spacing: set the h2's letter-spacing to 0 at vibe → parseFloat(headingLetterSpacing) >= 0 reds;
//   backdrop-filter: remove `backdrop-filter: blur(10px)` from html.vibe .section → vibeBackdrop === false reds;
//   box-shadow: set --vibe-glow to `0 25px 50px -12px transparent` → coloredShadow === false reds;
//   radius: set --vibe-radius to 4px (kex's value) → radius <= kex.radius reds.

test("vibe vocabulary: layout and chrome channels at pos=0 vs pos=0.5 (criterion 20)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  async function readAt(pos: number) {
    await page.evaluate((p) => {
      document.documentElement.style.setProperty("--pos", String(p));
      document.documentElement.style.colorScheme = p <= 0.25 ? "dark" : "light";
      document.documentElement.classList.toggle("vibe", p <= 0.25);
      document.documentElement.classList.toggle("win98", p > 0.75);
    }, pos);
    // Wait for the style recalc to settle (same Chromium custom-property hazard as the sweep).
    // Poll the section's computed backgroundColor alpha — a color-mix dependent — rather than
    // the root --snap1/--snap2 values (J's lesson: snap1 is not the dependent).
    await page.waitForFunction((p) => {
      const section = document.querySelector('.section');
      if (!section) return false;
      const bg = getComputedStyle(section).backgroundColor;
      const expectedAlpha = p <= 0.25 ? 0.1 : p > 0.75 ? 1 : 0;
      let actualAlpha: number;
      if (bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') actualAlpha = 0;
      else {
        let m = bg.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(',').map((x: string) => parseFloat(x.trim()));
          actualAlpha = parts.length === 4 ? parts[3] : 1;
        } else {
          m = bg.match(/color\(srgb\s+[\d.]+\s+[\d.]+\s+[\d.]+(?:\s*\/\s*([\d.]+))?\)/);
          if (m) actualAlpha = m[1] ? parseFloat(m[1]) : 1;
          else actualAlpha = -1;
        }
      }
      return Math.abs(actualAlpha - expectedAlpha) < 0.02;
    }, pos);

    return page.evaluate(() => {
      const section = document.querySelector(".section")!;
      const sectionCs = getComputedStyle(section);
      const pEl = document.querySelector(".section p")!;
      const pCs = getComputedStyle(pEl);
      const h2 = document.querySelector(".section h2")!;
      const h2Cs = getComputedStyle(h2);
      const mutedColor = getComputedStyle(document.querySelector(".meta")!).color;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      const canonicalColor = (color: string): string => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
        return `${r},${g},${b}`;
      };
      // Parse a box-shadow string into a list of shadow objects with their color.
      function parseBoxShadows(s: string): { color: string; r: number; g: number; b: number; a: number }[] {
        const shadows: { color: string; r: number; g: number; b: number; a: number }[] = [];
        // Match rgba(...) or rgb(...) within the box-shadow string.
        const colorRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)/g;
        let m;
        while ((m = colorRe.exec(s)) !== null) {
          const r = parseInt(m[1]), g = parseInt(m[2]), b = parseInt(m[3]);
          const a = m[4] ? parseFloat(m[4]) : 1;
          shadows.push({ color: m[0], r, g, b, a });
        }
        // Also handle color(srgb r g b / a) format.
        const srgbRe = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/g;
        while ((m = srgbRe.exec(s)) !== null) {
          const r = Math.round(parseFloat(m[1]) * 255);
          const g = Math.round(parseFloat(m[2]) * 255);
          const b = Math.round(parseFloat(m[3]) * 255);
          const a = m[4] ? parseFloat(m[4]) : 1;
          shadows.push({ color: m[0], r, g, b, a });
        }
        return shadows;
      }
      // A color is neutral if r, g, b are all equal (gray/black/white).
      function isNeutral(r: number, g: number, b: number): boolean {
        return r === g && g === b;
      }
      const boxShadow = sectionCs.boxShadow;
      const shadows = parseBoxShadows(boxShadow);
      // A colored shadow is non-neutral AND visible (alpha > 0.01). A transparent shadow
      // (alpha 0) is invisible regardless of its RGB, so it must not count as colored —
      // otherwise the vibe glow's transparent-at-kex shadow would read as colored.
      const coloredShadow = shadows.some((s) => s.a > 0.01 && !isNeutral(s.r, s.g, s.b));
      // Parse border width and color.
      const borderWidth = parseFloat(sectionCs.borderWidth);
      const borderColor = sectionCs.borderColor;
      const borderAlpha = (() => {
        let m = borderColor.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
          return parts.length === 4 ? parts[3] : 1;
        }
        m = borderColor.match(/color\(srgb\s+[\d.]+\s+[\d.]+\s+[\d.]+(?:\s*\/\s*([\d.]+))?\)/);
        if (m) return m[1] ? parseFloat(m[1]) : 1;
        return 1;
      })();
      // Parse radius.
      const radius = parseFloat(sectionCs.borderRadius);
      return {
        textAlign: pCs.textAlign,
        headingLetterSpacing: h2Cs.letterSpacing,
        backdropFilter: sectionCs.backdropFilter,
        webkitBackdropFilter: (sectionCs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter,
        borderWidth,
        borderAlpha,
        boxShadow,
        coloredShadow,
        radius,
        headingColor: canonicalColor(h2Cs.color),
        mutedColor: canonicalColor(mutedColor),
      };
    });
  }

  const vibe = await readAt(0);
  const kex = await readAt(0.5);

  console.log(`criterion 20 vibe (pos=0): textAlign=${vibe.textAlign} headingLS=${vibe.headingLetterSpacing} backdropFilter=${vibe.backdropFilter} borderWidth=${vibe.borderWidth} borderAlpha=${vibe.borderAlpha} coloredShadow=${vibe.coloredShadow} radius=${vibe.radius}`);
  console.log(`criterion 20 kex (pos=0.5): textAlign=${kex.textAlign} headingLS=${kex.headingLetterSpacing} backdropFilter=${kex.backdropFilter} borderWidth=${kex.borderWidth} borderAlpha=${kex.borderAlpha} coloredShadow=${kex.coloredShadow} radius=${kex.radius}`);

  // 1. The neutral heading-color flattening must not repaint the vibe dress: its section
  // headings retain the existing muted-violet channel used by the masthead metadata.
  expect(vibe.headingColor).toBe(vibe.mutedColor);

  // 2. text-align: center on body copy at vibe, not center at kex.
  expect(vibe.textAlign).toBe("center");
  expect(kex.textAlign).not.toBe("center");

  // 3. negative heading letter-spacing at vibe.
  expect(parseFloat(vibe.headingLetterSpacing)).toBeLessThan(0);

  // 4. non-none backdrop-filter with a translucent 1px border at vibe.
  const vibeBackdrop = vibe.backdropFilter !== "none" ||
    (typeof vibe.webkitBackdropFilter === "string" && vibe.webkitBackdropFilter !== "none" && vibe.webkitBackdropFilter !== "");
  expect(vibeBackdrop).toBe(true);
  expect(vibe.borderWidth).toBe(1);
  expect(vibe.borderAlpha).toBeGreaterThan(0);
  expect(vibe.borderAlpha).toBeLessThan(1);

  // 5. colored (non-neutral) box-shadow at vibe, not at kex.
  expect(vibe.coloredShadow).toBe(true);
  expect(kex.coloredShadow).toBe(false);

  // 6. border radius exceeds kex's at vibe.
  expect(vibe.radius).toBeGreaterThan(kex.radius);
});

// --- Criterion 21a (production-path reachability) ---

// The arm that proves the reachability claim: it drives the real slider — keyboard focus on the
// .handle plus Home/End, and pointer clicks near the .track edges — through SpectrumFigure's own
// onKeyDown/update/setPos path, then reads documentElement's classes. It never sets --pos and
// never toggles a class itself, so a broken production class toggle reds here (the direct-set
// driver below cannot see that — it toggles its own classes and asserts them, which is exactly
// the circularity this arm exists to break). Exact boundaries 0.25/0.75 are deliberately not
// driven here: accumulated arrow steps land at 0.25000000000000006 / 0.7500000000000002 in
// IEEE-754, so which side of the threshold they fall on is floating-point accident, not
// behavior; boundary parity stays in the direct-set arm, where the values are set exactly.
// Mutation: disable setPos's two classList.toggle calls and watch this arm red while the
// direct-set parity arm stays green.
test("reachability: production path — real slider input produces the class set (criterion 21)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const handle = page.locator(".spectrum .handle");
  const track = page.locator(".spectrum .track");
  const classes = () =>
    page.evaluate(() => ({
      vibe: document.documentElement.classList.contains("vibe"),
      win98: document.documentElement.classList.contains("win98"),
    }));

  // Resting state, no input yet: kex, neither class on.
  let c = await classes();
  console.log(`production reachability (rest): vibe=${c.vibe} win98=${c.win98}`);
  expect(c).toEqual({ vibe: false, win98: false });

  // Keyboard: Home maps to pos 0 (vibe), End to pos 1 (win98) — setPos clamps both exactly.
  await handle.focus();
  await page.keyboard.press("Home");
  c = await classes();
  console.log(`production reachability (keyboard Home): vibe=${c.vibe} win98=${c.win98}`);
  expect(c).toEqual({ vibe: true, win98: false });

  await page.keyboard.press("End");
  c = await classes();
  console.log(`production reachability (keyboard End): vibe=${c.vibe} win98=${c.win98}`);
  expect(c).toEqual({ vibe: false, win98: true });

  // Pointer: clicks 15px inside each track edge, through update()'s rect arithmetic — the same
  // mapping a drag takes. The left click maps to pos ≈ 0 (vibe), the right one to pos ≈ 0.997
  // (win98, no clamping involved). The extreme edge pixels are avoided deliberately: the last
  // pixel column of the track hit-tests to the section (subpixel edge), which stalls a click.
  // The box is re-read immediately before each click because the track's width is itself
  // dress-dependent (the flat --measure channel shrinks it at win98) — a box captured under one
  // dress misplaces the next click under another.
  await track.click({ position: { x: 15, y: 18 } });
  c = await classes();
  console.log(`production reachability (pointer near left edge): vibe=${c.vibe} win98=${c.win98}`);
  expect(c).toEqual({ vibe: true, win98: false });

  const box = await track.boundingBox();
  await track.click({ position: { x: box!.width - 15, y: 18 } });
  c = await classes();
  console.log(`production reachability (pointer near right edge): vibe=${c.vibe} win98=${c.win98}`);
  expect(c).toEqual({ vibe: false, win98: true });
});

// --- Criterion 21b (reachability driver parity, owed at K for both classes) ---

// What this arm actually proves: the gate drivers' own direct class toggles agree with the
// documented thresholds (vibe at pos <= 0.25, neither in the middle, win98 at pos > 0.75). It
// sets --pos and toggles the classes itself, then asserts the class set — circular about the
// production path: disabling SpectrumFigure's class toggles leaves it green. Production
// reachability is the arm above. It is kept because every captured state and pixel-read driver
// relies on that mirror being exactly the thresholds setPos uses — a drifted driver renders a
// dress no reader can reach, and this arm reds on the drift before any screenshot silently
// samples it. The boundary positions 0.25 and 0.75 are set (not stepped) here precisely because
// the class toggle carries the entire flat type/layout vocabulary and the remaining snap-stepped
// color channels. J shipped a resting capture with win98 left on at pos=0.5 and every other arm
// stayed green beside it; a second class doubles the ways to produce an artifact no reader can
// reach.

test("reachability: direct-set driver parity at each sampled state (criterion 21, not production)", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate((pos) => {
      document.documentElement.style.setProperty("--pos", String(pos));
      document.documentElement.style.colorScheme = pos <= 0.25 ? "dark" : "light";
      document.documentElement.classList.toggle("vibe", pos <= 0.25);
      document.documentElement.classList.toggle("win98", pos > 0.75);
    }, p);

    const classes = await page.evaluate(() =>
      document.documentElement.classList.contains("vibe"),
    );
    const win98 = await page.evaluate(() =>
      document.documentElement.classList.contains("win98"),
    );

    console.log(`reachability driver parity (pos=${p}): vibe=${classes} win98=${win98}`);

    if (p <= 0.25) {
      expect(classes).toBe(true);
      expect(win98).toBe(false);
    } else if (p > 0.75) {
      expect(classes).toBe(false);
      expect(win98).toBe(true);
    } else {
      expect(classes).toBe(false);
      expect(win98).toBe(false);
    }
  }
});

// --- Server contract: missing assets 404 (no SPA fallback masking) ---

// The figures server is the gate's only view of the built page; a fallback that serves
// index.html for a missing asset turns a broken script/stylesheet/font request into a 200
// carrying HTML. This arm pins the server's missing-asset 404 behavior — nothing broader:
// traversal handling is the equivalence server's own concern and is not claimed here.
// Mutation: revert the catch to the old `path = "index.html"` fallback and the probed status
// reads 200 — red.
test("server: missing assets return 404, not an index.html fallback", async ({ request }) => {
  const response = await request.get(`${url}missing-asset.probe`);
  console.log(`missing-asset probe: status=${response.status()}`);
  expect(response.status()).toBe(404);
});

// S4 structural typography arms. These read the neutral page as rendered, rather than checking
// token spelling. The values are deliberately independent of the temporary round-1 sheet: this
// is the selected treatment's contract, not a copy of a candidate's record.
test("typography: neutral hierarchy keeps headings at body size", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--pos", "0.5");
    document.documentElement.classList.remove("vibe", "win98");
  });
  await page.waitForFunction(() => getComputedStyle(document.body).fontWeight === "400");
  const reads = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const title = getComputedStyle(document.querySelector(".title")!);
    const heading = getComputedStyle(document.querySelector(".section h2")!);
    return {
      bodySize: parseFloat(body.fontSize),
      bodyWeight: body.fontWeight,
      titleSize: parseFloat(title.fontSize),
      headingSize: parseFloat(heading.fontSize),
      headingWeight: heading.fontWeight,
    };
  });
  console.log(`neutral hierarchy: body=${reads.bodySize}px/${reads.bodyWeight} heading=${reads.headingSize}px/${reads.headingWeight} title=${reads.titleSize}px`);
  expect(reads.headingSize).toBeGreaterThanOrEqual(reads.bodySize);
  expect(reads.titleSize).toBeGreaterThan(reads.headingSize);
  expect(reads.bodyWeight).toBe("400");
  expect(reads.headingWeight).toBe("600");
});

test("typography: neutral measure stays in the readable long-form band", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--pos", "0.5");
    document.documentElement.classList.remove("vibe", "win98");
  });
  await page.waitForFunction(() => {
    const page = document.querySelector(".page");
    return page !== null && Math.abs(page.getBoundingClientRect().width - 548) < 0.01;
  });
  const reads = await page.evaluate(() => {
    const lineLengths: number[] = [];
    for (const paragraph of document.querySelectorAll(".page .section p")) {
      const lines = new Map<number, number>();
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? "";
        for (let offset = 0; offset < text.length; offset += 1) {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset + 1);
          const rect = range.getBoundingClientRect();
          if (rect.width === 0) continue;
          const top = Math.round(rect.top);
          lines.set(top, (lines.get(top) ?? 0) + 1);
        }
      }
      const values = [...lines.values()];
      lineLengths.push(...values.slice(0, -1));
    }
    const pageBox = document.querySelector(".page")!.getBoundingClientRect();
    return {
      maximumNonFinalLine: Math.max(...lineLengths),
      pageWidth: pageBox.width,
      viewportWidth: window.innerWidth,
    };
  });
  console.log(`neutral measure: maximumNonFinalLine=${reads.maximumNonFinalLine} pageWidth=${reads.pageWidth} viewport=${reads.viewportWidth}`);
  // This is the standing portability contract, intentionally broader than S5's one-off
  // local selection arm below.
  expect(reads.maximumNonFinalLine).toBeGreaterThanOrEqual(60);
  expect(reads.maximumNonFinalLine).toBeLessThanOrEqual(75);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const page = document.querySelector(".page")!;
    const box = page.getBoundingClientRect();
    const styles = getComputedStyle(page);
    return {
      left: box.left,
      right: box.right,
      width: box.width,
      paddingLeft: parseFloat(styles.paddingLeft),
      paddingRight: parseFloat(styles.paddingRight),
      viewport: window.innerWidth,
    };
  });
  console.log(`mobile measure: page=${mobile.width}px padding=${mobile.paddingLeft}px/${mobile.paddingRight}px`);
  expect(mobile.width).toBe(mobile.viewport);
  expect(mobile.paddingLeft).toBe(20);
  expect(mobile.paddingRight).toBe(20);
});

test("typography: selected desktop measure is the widest passing local sweep", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--pos", "0.5");
    document.documentElement.classList.remove("vibe", "win98");
  });
  await page.waitForFunction(() => {
    const page = document.querySelector(".page");
    return page !== null && Math.abs(page.getBoundingClientRect().width - 548) < 0.01;
  });
  await page.evaluate(() => document.fonts.ready);
  const sweep = await page.evaluate(() => {
    const readMaximum = (width: number): number => {
      const style = document.createElement("style");
      style.textContent = `.page { max-width: ${width}px !important; }`;
      document.head.append(style);
      const lineLengths: number[] = [];
      for (const paragraph of document.querySelectorAll(".page .section p")) {
        const lines = new Map<number, number>();
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = node.textContent ?? "";
          for (let offset = 0; offset < text.length; offset += 1) {
            const range = document.createRange();
            range.setStart(node, offset);
            range.setEnd(node, offset + 1);
            const rect = range.getBoundingClientRect();
            if (rect.width === 0) continue;
            const top = Math.round(rect.top);
            lines.set(top, (lines.get(top) ?? 0) + 1);
          }
        }
        lineLengths.push(...[...lines.values()].slice(0, -1));
      }
      style.remove();
      return Math.max(...lineLengths);
    };
    const selected = readMaximum(548);
    const next = readMaximum(549);
    return {
      current: document.querySelector(".page")!.getBoundingClientRect().width,
      selected,
      next,
    };
  });
  console.log(`neutral measure selection: current=${sweep.current}px, 548px max=${sweep.selected}, 549px max=${sweep.next}`);
  expect(sweep.current).toBe(548);
  expect(sweep.selected).toBeLessThanOrEqual(75);
  expect(sweep.selected).toBeGreaterThanOrEqual(72);
  expect(sweep.next).toBeGreaterThan(75);
});

test("typography: production strong emphasis and section rhythm are visible on the neutral canvas", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--pos", "0.5");
    document.documentElement.classList.remove("vibe", "win98");
    const paragraph = document.querySelector(".section p")!;
    const strong = document.createElement("strong");
    strong.dataset.figureProbe = "strong-emphasis";
    strong.textContent = "strong emphasis";
    strong.style.display = "inline-block";
    strong.style.width = "120px";
    strong.style.height = "26px";
    paragraph.append(" ", strong);
  });
  const styles = await page.evaluate(() => {
    const paragraph = document.querySelector(".section p")!;
    const strong = paragraph.querySelector("strong")!;
    const body = getComputedStyle(paragraph);
    const emphasized = getComputedStyle(strong);
    return {
      paragraphColor: body.color,
      paragraphWeight: body.fontWeight,
      emphasisColor: emphasized.color,
      emphasisWeight: emphasized.fontWeight,
    };
  });
  console.log(`strong emphasis: body=${styles.paragraphWeight}/${styles.paragraphColor} strong=${styles.emphasisWeight}/${styles.emphasisColor}`);
  expect(styles.emphasisWeight).toBe("600");
  expect(styles.emphasisColor).not.toBe(styles.paragraphColor);

  const strong = page.locator('strong[data-figure-probe="strong-emphasis"]');
  const emphasized = await strong.screenshot();
  await strong.evaluate((element) => {
    const paragraph = element.closest("p")!;
    const paragraphStyle = getComputedStyle(paragraph);
    const plain = element as HTMLElement;
    plain.style.fontWeight = paragraphStyle.fontWeight;
    plain.style.color = paragraphStyle.color;
    plain.style.textShadow = "none";
  });
  const plain = await strong.screenshot();
  const emphasisDelta = perceptualDelta(plain, emphasized);
  console.log(`production strong emphasis canvas: meanDelta=${emphasisDelta.meanDelta.toFixed(2)} extent=${emphasisDelta.extent.toFixed(4)}`);
  expect(emphasisDelta.meanDelta).toBeGreaterThan(3);

  const rhythm = await page.evaluate(() => {
    const sections = [...document.querySelectorAll(".page .section")];
    const gaps = sections.slice(1).map((section, index) => {
      const previousParagraph = sections[index].querySelector("p:last-of-type")!.getBoundingClientRect();
      const heading = section.querySelector("h2")!.getBoundingClientRect();
      return heading.top - previousParagraph.bottom;
    });
    return { gaps, paragraphGap: parseFloat(getComputedStyle(sections[0].querySelector("p")!).marginTop) };
  });
  console.log(`neutral rhythm: gaps=${rhythm.gaps.map((gap) => gap.toFixed(1)).join(",")} paragraphGap=${rhythm.paragraphGap}`);
  for (const gap of rhythm.gaps) expect(gap).toBeGreaterThan(rhythm.paragraphGap * 2.5);
});

// The style sweep must not alter the story or the visualization contract. This is intentionally
// an observation of the consumer DOM: source markup and CSS token names cannot prove what readers
// receive after Svelte rendering and text-transform.
test("non-interference: story text, spectrum contract, and placeholder dimensions remain intact", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--pos", "0.5");
    document.documentElement.classList.remove("vibe", "win98");
  });
  const result = await page.evaluate(() => {
    const spectrum = document.querySelector(".spectrum")!;
    const handle = spectrum.querySelector(".handle")!;
    const placeholder = document.querySelector(".placeholder")!.getBoundingClientRect();
    return {
      text: (document.querySelector(".page") as HTMLElement).innerText,
      ariaLabel: handle.getAttribute("aria-label"),
      ariaNow: handle.getAttribute("aria-valuenow"),
      labels: [...spectrum.querySelectorAll(".axis-labels span")].map((el) => el.textContent?.trim()),
      descriptors: [...spectrum.querySelectorAll(".descriptors span")].map((el) => el.textContent?.trim()),
      placeholderHeight: placeholder.height,
    };
  });
  expect(result.text).toContain("Agentic engineering is the practice of directing agents");
  expect(result.text).toContain("the hard part moved from writing the code to checking it.");
  expect(result.text).toContain("The three are priced by cost against reach.");
  expect(result.ariaLabel).toBe("position on the spectrum");
  expect(result.ariaNow).toBe("50");
  expect(result.labels).toEqual(["vibe coding", "organic human code"]);
  expect(result.descriptors).toEqual(["the color a model picks by default", "every line written by hand"]);
  expect(result.placeholderHeight).toBe(320);
});
