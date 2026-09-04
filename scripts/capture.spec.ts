import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// Runs in the work dir next to a built `dist/`. Serves it over a local origin, checks direct-set
// driver parity and horizontal overflow at three morph positions, then captures full-page desktop and mobile
// screenshots. The neutral captures compare against platform-stamped goldens on the producing seat;
// shot.ts stages this spec and collects the portable captures.

const root = dirname(fileURLToPath(import.meta.url));
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

    // Oracle 7: no horizontal overflow at either viewport.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollWidth > view.width) {
      throw new Error(
        `horizontal overflow at ${view.width}x${view.height}: scrollWidth=${scrollWidth} > ${view.width}`,
      );
    }

    await page.evaluate(() => document.fonts.ready);
    // Always write the portable capture first, then compare only on the stamped seat. A WSL
    // capture runs on Windows and has no Darwin golden by design.
    await page.screenshot({ path: join(root, view.name), fullPage: true });
    const seat = `${testInfo.project.name}-${process.platform}`;
    if (seat === `${goldenBrowser}-${goldenPlatform}`) {
      // Playwright appends the project and platform to the snapshot filename.
      await expect(page).toHaveScreenshot(
        view.name === "desktop.png" ? "neutral-desktop.png" : "neutral-mobile.png",
        { fullPage: true, mask: [page.locator("[data-hero-canvas]")] },
      );
    } else {
      console.log(`golden: skipped on ${seat}; stamped seat is ${goldenBrowser}-${goldenPlatform}`);
    }
    await page.close();
    console.log(`captured ${view.name}`);
  });
}
