import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { perceptualDelta } from "./png";
import { settleToRest } from "./reduced";

// Both roots are served and captured inside one Playwright invocation so platform variance
// cancels. The liveness checks are independent on each side: identically broken roots or assets
// fail before equal fallback pixels can be mistaken for equivalence.
const preDist = process.env.EQ_PRE;
const postDist = process.env.EQ_POST;
if (!preDist || !postDist) throw new Error("equivalence: EQ_PRE and EQ_POST are required");

const base = "/agentic-engineering/";
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const positions = [0, 0.25, 0.5, 0.75, 1];

// Sub-JND raster noise may average at most one RGB level, and no pixel may exceed the JND.
// This is perceptual equivalence, not byte identity.
const MAX_MEAN_SUB_JND_DELTA = 1;

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

const morphDriver = async (page: import("@playwright/test").Page, pos: number) => {
  await page.evaluate((p) => {
    document.documentElement.style.setProperty("--pos", String(p));
    document.documentElement.style.colorScheme = p <= 0.25 ? "dark" : "light";
    document.documentElement.classList.toggle("vibe", p <= 0.25);
    document.documentElement.classList.toggle("win98", p > 0.75);
  }, pos);
};

async function serve(root: string): Promise<Server> {
  const server = createServer(async (req, res) => {
    let path = new URL(req.url ?? "/", "http://localhost").pathname;
    path = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, "");
    if (path === "" || path.endsWith("/")) path = "index.html";
    if (path.includes("..")) {
      res.writeHead(400);
      res.end();
      return;
    }
    try {
      const body = await readFile(join(root, path));
      res.writeHead(200, {
        "content-type": types[extname(path)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end(`missing asset: ${path}`);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

async function capture(
  browser: Browser,
  root: string,
  label: string,
  view: { width: number; height: number },
  pos: number,
): Promise<Buffer> {
  const server = await serve(root);
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error(`${label}: no server port`);
  const page = await browser.newPage({
    viewport: { width: view.width, height: view.height },
    deviceScaleFactor: 2,
  });
  const resourceFailures: string[] = [];
  page.on("requestfailed", (request) => {
    resourceFailures.push(`${request.url()}: ${request.failure()?.errorText ?? "request failed"}`);
  });
  page.on("response", (response) => {
    if (!response.ok()) resourceFailures.push(`${response.status()} ${response.url()}`);
  });

  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const response = await page.goto(`http://127.0.0.1:${address.port}${base}`, {
      waitUntil: "networkidle",
    });
    if (!response?.ok()) resourceFailures.push(`document status ${response?.status() ?? "none"}`);
    await page.locator(".page").waitFor({ state: "visible" });
    await page.evaluate(() => document.fonts.ready);
    const liveness = await page.evaluate(() => ({
      textLength: document.body.innerText.trim().length,
      externalAssets: document.querySelectorAll("script[src], link[rel='stylesheet'][href]").length,
    }));
    if (liveness.textLength < 500) {
      resourceFailures.push(`rendered text too short: ${liveness.textLength}`);
    }
    if (liveness.externalAssets < 1) {
      resourceFailures.push("no external script or stylesheet was loaded");
    }
    expect(resourceFailures, `${label} root/assets must be live`).toEqual([]);

    await morphDriver(page, pos);
    await settleToRest(page, "body");
    return await page.screenshot({ fullPage: true });
  } finally {
    await page.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

for (const view of viewports) {
  test(`equivalence: pre/post perceptually equivalent at ${view.name} (${view.width}x${view.height})`, async ({
    browser,
  }) => {
    const failures: string[] = [];
    for (const pos of positions) {
      const pre = await capture(browser, preDist, "baseline", view, pos);
      const post = await capture(browser, postDist, "candidate", view, pos);
      const delta = perceptualDelta(pre, post);
      console.log(
        `equivalence ${view.name} pos=${pos}: meanDelta=${delta.meanDelta.toFixed(4)} maxDelta=${delta.maxDelta} extent=${delta.extent.toFixed(6)}`,
      );
      if (delta.meanDelta > MAX_MEAN_SUB_JND_DELTA || delta.extent > 0) {
        failures.push(
          `${view.name} pos=${pos}: meanDelta=${delta.meanDelta.toFixed(4)} maxDelta=${delta.maxDelta} extent=${delta.extent.toFixed(6)}`,
        );
      }
    }
    expect(failures).toEqual([]);
  });
}
