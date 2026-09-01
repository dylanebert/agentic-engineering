import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// Runs in the work dir next to a built `dist/`. Serves it over a local origin, checks direct-set
// driver parity and horizontal overflow at three morph positions, then captures full-page desktop and mobile
// screenshots. The neutral captures compare against platform-stamped goldens on the producing seat;
// shot.ts stages this spec and collects the portable captures.

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

test("server: capture missing assets return 404, not an index.html fallback", async ({ request }) => {
  const response = await request.get(`${url}missing-asset.probe`);
  console.log(`capture missing-asset probe: status=${response.status()}`);
  expect(response.status()).toBe(404);
});

const views = [
  { name: "desktop.png", width: 1440, height: 900 },
  { name: "mobile.png", width: 390, height: 844 },
];
const goldenBrowser = "chromium";
const goldenPlatform = "darwin";

// Three sampled morph positions: 0 = vibe, 0.5 = kex, 1 = win98.
const morphPositions = [0, 0.5, 1];

for (const view of views) {
  test(`capture ${view.name} (${view.width}x${view.height})`, async ({ browser }, testInfo) => {
    const page = await browser.newPage({
      viewport: { width: view.width, height: view.height },
      deviceScaleFactor: 2,
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    // A full-page screenshot captures beyond the viewport without scrolling, so `loading="lazy"`
    // images below the fold are never requested. Scroll the page to trigger them, then wait for
    // every image to finish decoding before shooting.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      window.scrollTo(0, 0);
    });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((img) => img.decode().catch(() => undefined)),
      ),
    );

    // Oracle 7: no horizontal overflow at either viewport, at all three morph positions.
    // Wait for the style recalc to settle before reading scrollWidth — the same
    // custom-property-dependent style issue as the contrast sweep (BLOCKER 1).
    for (const p of morphPositions) {
      await page.evaluate((pos) => {
        document.documentElement.style.setProperty("--pos", String(pos));
        document.documentElement.style.colorScheme = pos <= 0.25 ? "dark" : "light";
        document.documentElement.classList.toggle("vibe", pos <= 0.25);
        document.documentElement.classList.toggle("win98", pos > 0.75);
      }, p);
      // Wait for the style recalc to settle. This read is scrollWidth, which forces layout and so
      // forces recalc — that is why this wait is sufficient. --snap1/--snap2 are registered
      // @property inputs on :root, not dependents; Chromium recalculates them promptly, before the
      // color-mix results that depend on them. Polling a registered root property is therefore not
      // a dependent wait — any site reading a computed *derived* value must poll that derived value
      // instead (the contrast sweep in figures.spec.ts does exactly that, on the section's computed
      // backgroundColor alpha, and handles 'transparent' explicitly). (BLOCKER 1.)
      await page.waitForFunction((p) => {
        const cs = getComputedStyle(document.documentElement);
        const snap1 = parseFloat(cs.getPropertyValue('--snap1') || '-1');
        const snap2 = parseFloat(cs.getPropertyValue('--snap2') || '-1');
        const expectedSnap1 = p <= 0.25 ? 0 : 1;
        const expectedSnap2 = p > 0.75 ? 1 : 0;
        return Math.abs(snap1 - expectedSnap1) < 0.001 && Math.abs(snap2 - expectedSnap2) < 0.001;
      }, p);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > view.width) {
        throw new Error(
          `horizontal overflow at ${view.width}x${view.height} pos=${p}: scrollWidth=${scrollWidth} > ${view.width}`,
        );
      }
      // Direct-set driver parity: the gate's class driver must match each documented threshold.
      const hasVibe = await page.evaluate(() => document.documentElement.classList.contains("vibe"));
      const hasWin98 = await page.evaluate(() => document.documentElement.classList.contains("win98"));
      if (p <= 0.25) {
        if (!hasVibe) throw new Error(`direct-set driver parity: vibe class missing at pos=${p}`);
        if (hasWin98) throw new Error(`direct-set driver parity: win98 class present at pos=${p}`);
      } else if (p > 0.75) {
        if (hasVibe) throw new Error(`direct-set driver parity: vibe class present at pos=${p}`);
        if (!hasWin98) throw new Error(`direct-set driver parity: win98 class missing at pos=${p}`);
      } else {
        if (hasVibe) throw new Error(`direct-set driver parity: vibe class present at pos=${p}`);
        if (hasWin98) throw new Error(`direct-set driver parity: win98 class present at pos=${p}`);
      }
    }

    // Capture at the resting position (kex, 0.5) for the screenshot. Remove both classes
    // so the resting capture is a state selected by the direct-set driver — the overflow loop ends at p=1
    // with html.win98 on, and resetting --pos alone leaves the class (BLOCKER 2). With html.vibe
    // added at K, the same hazard doubles: the loop starts at p=0 with html.vibe on.
    // Wait for the style recalc to settle (snap2=0 at pos=0.5, so section bg goes transparent).
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--pos", "0.5");
      document.documentElement.style.colorScheme = "light";
      document.documentElement.classList.remove("vibe");
      document.documentElement.classList.remove("win98");
    });
    await page.waitForFunction(() => {
      const cs = getComputedStyle(document.documentElement);
      const snap1 = parseFloat(cs.getPropertyValue('--snap1') || '-1');
      const snap2 = parseFloat(cs.getPropertyValue('--snap2') || '-1');
      return Math.abs(snap1 - 1) < 0.001 && Math.abs(snap2 - 0) < 0.001;
    });
    // Direct-set driver parity at rest: neither dress class should be on at pos=0.5.
    const restVibe = await page.evaluate(() => document.documentElement.classList.contains("vibe"));
    const restWin98 = await page.evaluate(() => document.documentElement.classList.contains("win98"));
    if (restVibe) throw new Error("direct-set driver parity: vibe class left on at resting pos=0.5");
    if (restWin98) throw new Error("direct-set driver parity: win98 class left on at resting pos=0.5");
    await page.evaluate(() => document.fonts.ready);
    // Always write the portable capture first, then compare only on the stamped seat. A WSL
    // capture runs on Windows and has no Darwin golden by design.
    await page.screenshot({ path: join(root, view.name), fullPage: true });
    const seat = `${testInfo.project.name}-${process.platform}`;
    if (seat === `${goldenBrowser}-${goldenPlatform}`) {
      // Playwright appends the project and platform to the snapshot filename.
      await expect(page).toHaveScreenshot(
        view.name === "desktop.png" ? "neutral-desktop.png" : "neutral-mobile.png",
        { fullPage: true },
      );
    } else {
      console.log(`golden: skipped on ${seat}; stamped seat is ${goldenBrowser}-${goldenPlatform}`);
    }
    await page.close();
    console.log(`captured ${view.name}`);
  });
}
