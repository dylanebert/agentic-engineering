import { createServer, type Server } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

// Rendered-text oracle (criteria 3 and 4, amended at E's review). Extracts the built page's
// visible text through the same harness the capture and figure specs use — a local server over
// the built dist/ — and runs the voice ban list, the em-dash cap (voice.md: ≤1), and the novelty
// regex over that text. A hit in rendered text is a real hit: the regex reads what a reader reads,
// not source files, so CSS keywords and code comments stop being false positives.

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

// Voice ban list (oracle 3). Zero hits required.
const BAN_RE =
  /\b(delve|leverage|unlock|foster|elevate|showcase|tapestry|robust|seamless|groundbreaking|transformative|pivotal|comprehensive|crucial|compelling|nuanced|multifaceted|cutting-edge|utilize|facilitate|endeavor|underpin|underscore|noteworthy|intricate|holistic|paradigm|realm)\b/gi;

// Em-dash cap (oracle 3, voice.md hard cap: ≤1).
const EMDASH_RE = /—/g;

// Novelty-claim regex (oracle 4). Each hit is adjudicated in writing.
const NOVELTY_RE =
  /\b(nobody|no one|none|nothing|never|not a single|first to|only one|unlike any|closest|missing|hasn.t been|everyone|everybody|always|universally|the industry|the field)\b/gi;

test("rendered text: voice ban list, em-dash cap, novelty grep", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // Extract all visible text. innerText respects CSS visibility/display, so hidden elements
  // are excluded. This captures the prose in App.svelte, every figure caption, and the spec
  // figure's rendered spans — everything a reader reads.
  const text = await page.evaluate(() => document.body.innerText ?? "");

  // RENDERED_TEXT_OUT (absolute path) dumps that same text for the cold gates (criteria 8/9/10),
  // so a fresh reader reads what a reader reads — the body prose plus every figure caption plus
  // the spec figure's spans — rather than a source file carrying markup, CSS and mount points.
  const out = process.env.RENDERED_TEXT_OUT;
  if (out) await writeFile(out, text, "utf8");

  const banHits = [...text.matchAll(BAN_RE)].map((m) => m[0]);
  const emdashCount = (text.match(EMDASH_RE) ?? []).length;
  const noveltyHits = [...text.matchAll(NOVELTY_RE)].map((m) => ({
    word: m[0],
    context: text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20),
  }));

  console.log(`rendered-text oracle: ban=${banHits.length} emdash=${emdashCount} novelty=${noveltyHits.length}`);
  if (banHits.length > 0) console.log(`  ban hits: ${banHits.join(", ")}`);
  if (noveltyHits.length > 0) {
    for (const h of noveltyHits) console.log(`  novelty: "${h.word}" in "...${h.context}..."`);
  }

  expect(banHits).toEqual([]);
  expect(emdashCount).toBeLessThanOrEqual(1);
});
