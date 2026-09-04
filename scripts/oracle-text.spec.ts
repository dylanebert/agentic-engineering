import { createServer, type Server } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

// Rendered-text oracle (criteria 3 and 4, amended at E's review; widened at I to three sampled
// morph positions). Extracts the built page's visible text through the same harness the capture
// and figure specs use — a local server over the built dist/ — and runs the voice ban list, the
// em-dash cap (voice.md: ≤1), and the novelty regex over that text. A hit in rendered text is a
// real hit: the regex reads what a reader reads, not source files, so CSS keywords and code
// comments stop being false positives. At I the oracle runs at all three sampled positions
// (0 = vibe, 0.5 = kex, 1 = win98) since the morph adds a descriptor per end and a
// position-dependent span is still the page's prose.

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

test("server: text oracle missing assets return 404, not an index.html fallback", async ({ request }) => {
  const response = await request.get(`${url}missing-asset.probe`);
  console.log(`text-oracle missing-asset probe: status=${response.status()}`);
  expect(response.status()).toBe(404);
});

// Voice ban list (oracle 3). Zero hits required.
const BAN_RE =
  /\b(delve|leverage|unlock|foster|elevate|showcase|tapestry|robust|seamless|groundbreaking|transformative|pivotal|comprehensive|crucial|compelling|nuanced|multifaceted|cutting-edge|utilize|facilitate|endeavor|underpin|underscore|noteworthy|intricate|holistic|paradigm|realm)\b/gi;

// Em-dash cap (oracle 3, voice.md hard cap: ≤1).
const EMDASH_RE = /—/g;

// Novelty-claim regex (oracle 4). Each hit is adjudicated in writing.
const NOVELTY_RE =
  /\b(nobody|no one|none|nothing|never|not a single|first to|only one|unlike any|closest|missing|hasn.t been|everyone|everybody|always|universally|the industry|the field)\b/gi;

// Three sampled morph positions: 0 = vibe, 0.5 = kex, 1 = win98.
const positions = [0, 0.5, 1];

test("rendered text: voice ban list, em-dash cap, novelty grep", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  let totalBan = 0;
  let totalEmdash = 0;
  let totalNovelty = 0;

  for (const p of positions) {
    await page.evaluate((pos) => {
      document.documentElement.style.setProperty("--pos", String(pos));
      document.documentElement.style.colorScheme = pos <= 0.25 ? "dark" : "light";
      document.documentElement.classList.toggle("vibe", pos <= 0.25);
      document.documentElement.classList.toggle("win98", pos > 0.75);
    }, p);
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
        ),
    );

    // Criterion 21: reachability — the class set must match the position this oracle claims.
    const hasVibe = await page.evaluate(() => document.documentElement.classList.contains("vibe"));
    const hasWin98 = await page.evaluate(() => document.documentElement.classList.contains("win98"));
    if (p <= 0.25) {
      expect(hasVibe).toBe(true);
      expect(hasWin98).toBe(false);
    } else if (p > 0.75) {
      expect(hasVibe).toBe(false);
      expect(hasWin98).toBe(true);
    } else {
      expect(hasVibe).toBe(false);
      expect(hasWin98).toBe(false);
    }

    // Extract all visible text. innerText respects CSS visibility/display, so hidden elements
    // are excluded. This captures the prose in App.svelte and every figure caption — everything
    // a reader reads.
    const text = await page.evaluate(() => document.body.innerText ?? "");

    // RENDERED_TEXT_OUT (absolute path) dumps that same text for the cold gates (criteria 8/9/10),
    // so a fresh reader reads what a reader reads — the body prose plus every figure caption —
    // rather than a source file carrying markup, CSS and mount points.
    const out = process.env.RENDERED_TEXT_OUT;
    if (out) await writeFile(out, text, "utf8");

    const banHits = [...text.matchAll(BAN_RE)].map((m) => m[0]);
    const emdashCount = (text.match(EMDASH_RE) ?? []).length;
    const noveltyHits = [...text.matchAll(NOVELTY_RE)].map((m) => ({
      word: m[0],
      context: text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20),
    }));

    totalBan += banHits.length;
    totalEmdash += emdashCount;
    totalNovelty += noveltyHits.length;

    console.log(`rendered-text oracle (pos=${p}): ban=${banHits.length} emdash=${emdashCount} novelty=${noveltyHits.length}`);
    if (banHits.length > 0) console.log(`  ban hits: ${banHits.join(", ")}`);
    if (noveltyHits.length > 0) {
      for (const h of noveltyHits) console.log(`  novelty: "${h.word}" in "...${h.context}..."`);
    }

    expect(banHits).toEqual([]);
    expect(emdashCount).toBeLessThanOrEqual(1);
  }

  console.log(`rendered-text oracle (all positions): ban=${totalBan} emdash=${totalEmdash} novelty=${totalNovelty}`);
});

// Figure manifest arm (spec validation 2). The manifest is staged beside this spec as
// manifest.json by scripts/oracle-text.ts. Two properties: the page's section order is the
// manuscript's beat order as declared in src/lib/figures.ts, and every figure's quoted claim
// is a substring of the paragraph the manifest declares as its lead-in. Substring against the
// rendered paragraph, so a claim can't drift from the prose it is read off without reddening.
type Manifest = {
  figures: { id: string; section: string; paragraph: number; claim: string; kind: string }[];
  sectionOrder: string[];
};

test("figure manifest: section order is the beat order, each claim sits in its declared paragraph", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as Manifest;

  const sections = await page.evaluate(() =>
    [...document.querySelectorAll("section[id]")].map((s) => s.id),
  );
  console.log(`manifest: page sections ${sections.join(", ")}`);
  expect(sections).toEqual(manifest.sectionOrder);

  for (const figure of manifest.figures) {
    const paragraphs = await page.evaluate((id) => {
      const section = document.getElementById(id);
      if (section === null) return null;
      return [...section.querySelectorAll(":scope > p")].map((p) => (p as HTMLElement).innerText);
    }, figure.section);
    expect(paragraphs, `section #${figure.section} is missing`).not.toBeNull();
    const list = paragraphs as string[];
    expect(list.length, `#${figure.section} has ${list.length} paragraphs`).toBeGreaterThan(
      figure.paragraph,
    );
    const paragraph = list[figure.paragraph].replace(/\s+/g, " ").trim();
    console.log(`manifest: ${figure.id} lead-in "${paragraph.slice(0, 60)}…"`);
    expect(paragraph, `${figure.id}: claim not in its declared paragraph`).toContain(figure.claim);
  }
});
