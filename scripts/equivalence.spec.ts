import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { perceptualDelta } from "./png";

// The pre/post pixel-differential spec S2 consumes (staged here by equivalence.ts). One browser
// run serves BOTH builds over local origins and compares full-page screenshots pairwise at the
// five sampled morph positions across two viewports, so environment variance (fonts, GPU,
// compositor) cancels — the same playwright invocation reads both sides of every pair.
//
// Pass verdict: every pair must be perceptually identical — meanDelta ≤ 1 (the instrument's own
// MEAN_FLOOR) and no pixel above the JND (extent = 0). Anything else is a pixel the refactor
// moved and the gate reds with the position and the delta.

const preDist = process.env.EQ_PRE!;
const postDist = process.env.EQ_POST!;
if (!preDist || !postDist) throw new Error("equivalence: EQ_PRE and EQ_POST are required");

const base = "/agentic-engineering/";
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const positions = [0, 0.25, 0.5, 0.75, 1];

// The morph driver from figures.spec.ts: sets --pos on :root, mirrors color-scheme, and toggles
// the vibe/win98 classes so the entire page restyles exactly as a reader's drag would.
const morphDriver = async (page: import("@playwright/test").Page, pos: number) => {
  await page.evaluate((p) => {
    document.documentElement.style.setProperty("--pos", String(p));
    document.documentElement.style.colorScheme = p <= 0.25 ? "dark" : "light";
    document.documentElement.classList.toggle("vibe", p <= 0.25);
    document.documentElement.classList.toggle("win98", p > 0.75);
  }, pos);
};

async function serve(root: string): Promise<Server> {
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".woff2": "font/woff2",
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".mp4": "video/mp4",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".map": "application/json",
  };
  return createServer(async (req, res) => {
    let path = new URL(req.url ?? "/", "http://localhost").pathname;
    path = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, "");
    if (path === "" || path.endsWith("/")) path = "index.html";
    let body: Buffer;
    try {
      body = await readFile(join(root, path));
    } catch {
      body = await readFile(join(root, "index.html"));
    }
    const type = types[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  });
}

for (const view of viewports) {
  test(`equivalence: pre/post pixel-identical at ${view.name} (${view.width}x${view.height})`, async ({
    browser,
  }) => {
    const failures: string[] = [];
    for (const pos of positions) {
      const shots: Buffer[] = [];
      for (const dist of [preDist, postDist]) {
        const server = await serve(dist);
        const listening = new Promise<void>((resolve) =>
          server.once("listening", resolve),
        );
        server.listen(0, "127.0.0.1");
        await listening;
        const port = (server.address() as { port: number }).port;
        const page = await browser.newPage({
          viewport: { width: view.width, height: view.height },
          deviceScaleFactor: 2,
        });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`http://127.0.0.1:${port}${base}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await morphDriver(page, pos);
        // Settle condition read: two consecutive rAF-separated frames must land before the shot.
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
            ),
        );
        shots.push(await page.screenshot({ fullPage: true }));
        await page.close();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      const delta = perceptualDelta(shots[0], shots[1]);
      console.log(
        `equivalence ${view.name} pos=${pos}: meanDelta=${delta.meanDelta.toFixed(4)} maxDelta=${delta.maxDelta} extent=${delta.extent.toFixed(6)}`,
      );
      if (delta.meanDelta > 1 || delta.extent > 0) {
        failures.push(
          `${view.name} pos=${pos}: meanDelta=${delta.meanDelta.toFixed(4)} maxDelta=${delta.maxDelta} extent=${delta.extent.toFixed(6)}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });
}
