import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

// Prose tripwires over the built page's rendered text (prose.md Concision; spec validation 3).
// Two numbers, both derived in prose.md from measured reference prose and floored there: no
// rendered paragraph over 79 words, and relativizers under 12.0 per 1,000 words across the whole
// document. Both read the rendered page through the same local-server harness the text oracle
// uses, so the units counted are the units a reader receives: every p and every li is a prose
// block, and the rate is over the page's whole visible text.

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

// prose.md Concision: paragraph mass 79 words, clause density 12.0 relativizers per 1,000 words.
const PARAGRAPH_MAX = 79;
const RELATIVIZER_MAX = 12.0;
const RELATIVIZER_RE = /\b(that|which|who|whom|whose)\b/gi;

test("tripwires: no rendered paragraph over 79 words", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll("p, li")].map((el) => (el as HTMLElement).innerText),
  );

  const counts = blocks.map((b) => ({
    words: b.trim().split(/\s+/).filter(Boolean).length,
    text: b.replace(/\s+/g, " ").trim(),
  }));
  const over = counts.filter((c) => c.words > PARAGRAPH_MAX);
  const longest = counts.reduce((m, c) => Math.max(m, c.words), 0);

  console.log(`tripwires: ${counts.length} blocks, longest ${longest} words (cap ${PARAGRAPH_MAX})`);
  for (const c of over) console.log(`  over: ${c.words} words: "${c.text.slice(0, 80)}…"`);

  expect(over.map((c) => c.words)).toEqual([]);
});

test("tripwires: relativizer rate under 12.0 per 1,000 words", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const text = await page.evaluate(() => document.body.innerText ?? "");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const hits = [...text.matchAll(RELATIVIZER_RE)].map((m) => m[0]);
  const rate = words === 0 ? 0 : (hits.length / words) * 1000;

  console.log(
    `tripwires: ${hits.length} relativizers in ${words} words = ${rate.toFixed(2)} per 1k (cap under ${RELATIVIZER_MAX})`,
  );
  console.log(`  hits: ${hits.join(", ")}`);

  expect(rate).toBeLessThan(RELATIVIZER_MAX);
});
