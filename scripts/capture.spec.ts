import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "@playwright/test";

// Runs in the work dir next to a built `dist/`. Serves it over a local origin, captures a
// full-page desktop + mobile screenshot, then shuts the server down. Driven by shot.ts.
// At I the overflow check (oracle 7) runs at all three sampled morph positions (0 = vibe,
// 0.5 = kex, 1 = win98) at each viewport, since Windows 98 chrome is the plausible overflow source.

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

const views = [
  { name: "desktop.png", width: 1440, height: 900 },
  { name: "mobile.png", width: 390, height: 844 },
];

// Three sampled morph positions: 0 = vibe, 0.5 = kex, 1 = win98.
const morphPositions = [0, 0.5, 1];

for (const view of views) {
  test(`capture ${view.name} (${view.width}x${view.height})`, async ({ browser }) => {
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
    for (const p of morphPositions) {
      await page.evaluate((pos) => {
        document.documentElement.style.setProperty("--pos", String(pos));
        document.documentElement.style.colorScheme = pos < 0.25 ? "dark" : "light";
        document.documentElement.classList.toggle("win98", pos > 0.75);
      }, p);
      await page.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
          ),
      );
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > view.width) {
        throw new Error(
          `horizontal overflow at ${view.width}x${view.height} pos=${p}: scrollWidth=${scrollWidth} > ${view.width}`,
        );
      }
    }

    // Capture at the resting position (kex, 0.5) for the screenshot.
    await page.evaluate(() => {
      document.documentElement.style.setProperty("--pos", "0.5");
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(root, view.name), fullPage: true });
    await page.close();
    console.log(`captured ${view.name}`);
  });
}
