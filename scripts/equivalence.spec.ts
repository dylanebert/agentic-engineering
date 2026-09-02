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
const restoreRetiredDress = process.env.EQ_RESTORE_RETIRED_DRESS === "1";
const visibleMutation = process.env.EQ_MUTATE_RETIRED_DRESS === "visible";

// This is the deleted layer at its last production input (--pos: 0.5). It is installed only in
// the baseline document, after both sides load the same frozen build. The mutation makes its
// decorative blob visible, proving the A/B observes the layer rather than two identical roots.
const retiredDress = `
.page { position:relative; z-index:0; overflow-x:clip }
.head { background:transparent; box-shadow:none; border-radius:4px; padding:0 }
.section { background:transparent; box-shadow:none; border-radius:4px; padding:0 }
.masthead-blob { position:absolute; top:-100px; left:0; right:0; height:400px;
  background:radial-gradient(ellipse 60% 50% at 50% 50%, rgba(168,85,247,0), transparent 70%);
  filter:blur(80px); pointer-events:none; z-index:-1 }
.section h2::after,.title::after { content:"\\2013  \\25A1  \\2715"; float:right;
  margin-left:0; font-size:0; font-weight:700; letter-spacing:2px; opacity:0; line-height:1 }
`;

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
  installRetiredDress: boolean,
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

    if (installRetiredDress) {
      await page.evaluate(({ css, mutate }) => {
        const style = document.createElement("style");
        style.dataset.equivalenceRetiredDress = "";
        style.textContent = mutate
          ? `${css}\n.masthead-blob{background:#ff00ff;filter:none;opacity:1}`
          : css;
        document.head.append(style);
        const blob = document.createElement("div");
        blob.className = "masthead-blob";
        blob.setAttribute("aria-hidden", "true");
        document.querySelector(".page")?.prepend(blob);
      }, { css: retiredDress, mutate: visibleMutation });
    }
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
    const pre = await capture(browser, preDist, "baseline", view, restoreRetiredDress);
    const post = await capture(browser, postDist, "candidate", view, false);
    const delta = perceptualDelta(pre, post);
    console.log(
      `equivalence ${view.name}: meanDelta=${delta.meanDelta.toFixed(4)} maxDelta=${delta.maxDelta} extent=${delta.extent.toFixed(6)}`,
    );
    expect(delta.meanDelta).toBeLessThanOrEqual(MAX_MEAN_SUB_JND_DELTA);
    expect(delta.extent).toBe(0);
  });
}
