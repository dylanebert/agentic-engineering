import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion } from "./reduced";

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
// Verification: --pos (0-1) drives the highlight along the cost-reach diagonal.
// Three steps at the three point positions: machine (0.2), agent (0.5), human (0.8).
const verificationDriver: AxisDriver = async (page, step) => {
  const positions = [0.2, 0.5, 0.8];
  await page
    .locator(".verification")
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
