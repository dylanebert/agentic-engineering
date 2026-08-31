import { createServer, type Server } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { decodePng, perceptualDelta } from "./png";
import { candidates, FONT_URL_EXTRA, type Candidate } from "./candidates";

// Contact-sheet admissibility gate (spec stage S3, validation gate 10's pre-presentation arms).
// Serves the built dist over a local origin, loads the neutral state (pos 0.5, no dress class),
// injects each round-1 typography candidate from candidates.ts at runtime, and proves before any
// human sees the sheet that:
//
//   candidate identity — every frame is the candidate it claims: computed body weight/size,
//     heading size/weight, measure, and section/paragraph rhythm match the candidate's recorded
//     system, and the hierarchy channel moved the heading ink off --text-muted.
//     Mutation (recorded at the S3 run, exit 1): append `:root { --body-font-weight: 500; }` to
//     candidate A's css (/* MUT1 */) so its computed weight contradicts its recorded 400.
//
//   intended-channel variance — all six candidate pairs differ on at least one recorded
//     type/layout channel AND perceptually in pixels at both viewports (fixed crop, so the
//     dimensions match and the delta is meaningful).
//     Mutation (exit 1): append candidate A's full rule set into candidate B's css (/* MUT2 */)
//     so the A/B pair renders identically and the pair leg reds.
//
//   rendered-text identity — the page's innerText is identical from the unstyled neutral
//     baseline through every candidate at both viewports (innerText reflects rendered
//     text-transform, so a candidate that touched case cannot hide).
//     Mutation (exit 1): append `.page .section h2 { text-transform: uppercase; }` to
//     candidate C's css (/* MUT3 */).
//
//   visualization-state identity — --pos stays 0.5, no vibe/win98 class, the spectrum's
//     aria-valuenow, axis labels, and descriptors stay identical to the baseline, scroll rests
//     at 0, and every capture's decoded dimensions match the baseline's (the crop is pinned,
//     not just claimed).
//     Mutation (exit 1): append `:root { --pos: 1; }` to candidate D's css (/* MUT4 */).
//
//   palette channels — body ink, body background, link accent, and section background stay
//     identical to the baseline's computed reads.
//     Mutation (exit 1): append `body { color: #b026ff; }` to candidate B's css (/* MUT5 */).
//
//   loaded fonts — IBM Plex Sans renders at each candidate's recorded body weight (the canvas
//     width of the requested weight must differ from every other loaded weight's — a missing
//     face silently renders the nearest loaded face and the widths coincide), and Outfit
//     renders at each recorded heading weight against the loaded Outfit weights (500/600 from
//     index.html, 700 from FONT_URL_EXTRA).
//     Mutation (exit 1): rewrite FONT_URL_EXTRA's `wght@400;500` to `wght@500` so the 400 face
//     is absent and candidates A/B's weight check reds.
//
//   no overflow — documentElement.scrollWidth never exceeds the viewport at either size, for
//     the baseline and every candidate.
//     Mutation (exit 1): append a 1600×10px body::after block to candidate D's css (/* MUT7 */;
//     the block carries height — a zero-height empty box adds no scrollable overflow).
//
//   sheet artifact — sheet.png is written, is at least four desktop rows tall, and embeds four
//     pairwise byte-distinct captures.
//     Mutation (exit 1): rewrite the compose loop's `for (const c of candidates)` to
//     `candidates.slice(0, 3)` so the sheet loses a row and the height leg reds.
//
// The observation channels follow the figure gate's law: identity/variance read computed style
// and canvas font metrics off the rendered page plus pixel deltas, never the injected css text —
// a candidate whose css was silently swapped would still have to render its recorded system to
// pass. Runs in the work dir staged by contact.ts, next to a built dist/ (404 on missing
// assets — the same no-SPA-fallback server contract the figure gate pins, since a missing
// stylesheet "rendered" via an HTML payload would feed every arm a page that never styled).

const root = __dirname;
const dist = join(root, "dist");
const base = "/agentic-engineering/";

// Generous per-test ceiling: beforeAll collects ten page loads (five states × two viewports)
// plus the sheet composition before the first assertion runs.
test.setTimeout(300_000);

// Fixed crop per viewport — the same rect for the baseline and every candidate, so conditions
// are identical and pixel deltas are same-shape reads. Crop heights were frozen after one
// visual read: desktop shows title + first section + the spectrum's header region; mobile the
// same passage at its own height.
const DESKTOP = { width: 1440, height: 900, cropHeight: 1350 };
const MOBILE = { width: 390, height: 844, cropHeight: 1688 };
const SHEET_DESKTOP_WIDTH = 1000;
const SHEET_MOBILE_WIDTH = 256;

// Same perceptual floors as the variance harness (variance.ts): JND-grounded, not tuned.
const MEAN_FLOOR = 1;
const EXTENT_FLOOR = 0.01;

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
let url = "";

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    let path = new URL(req.url ?? "/", "http://localhost").pathname;
    path = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, "");
    if (path === "" || path.endsWith("/")) path = "index.html";
    let body: Buffer;
    try {
      body = await readFile(join(dist, path));
    } catch {
      // 404 on missing assets — no SPA fallback (same contract the figure gate pins).
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end(`missing asset: ${path}`);
      return;
    }
    const type = types[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

interface Reads {
  bodyWeight: string;
  bodySize: string;
  h2Size: string;
  h2Weight: string;
  h2Color: string;
  h2MarginBottom: string;
  pageMaxWidth: string;
  sectionMarginTop: string;
  pMarginTop: string;
  bodyColor: string;
  bodyBg: string;
  linkColor: string;
  inkProbe: string;
  sectionBg: string;
  pos: string;
  vibe: boolean;
  win98: boolean;
  ariaNow: string | null;
  axisLabels: string[];
  descriptors: string[];
  scrollY: number;
  scrollWidth: number;
  charsPerLine: number;
  plexWidths: Record<string, number>;
  outfitWidths: Record<string, number>;
  bodyFamily: string;
  h2Family: string;
}

interface Reading {
  key: string;
  desktop: Buffer;
  mobile: Buffer;
  desktopText: string;
  mobileText: string;
  desktopReads: Reads;
  mobileReads: Reads;
}

// The neutral page must load without a dress and at the resting position; this is asserted at
// load time so a collection that sampled the wrong state fails loudly instead of feeding every
// arm a wrong baseline.
async function gotoNeutral(page: Page, candidate?: Candidate): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.classList.remove("vibe");
    document.documentElement.classList.remove("win98");
  });
  const state = await page.evaluate(() => ({
    pos: getComputedStyle(document.documentElement).getPropertyValue("--pos").trim(),
    vibe: document.documentElement.classList.contains("vibe"),
    win98: document.documentElement.classList.contains("win98"),
  }));
  if (state.pos !== "0.5" || state.vibe || state.win98) {
    throw new Error(`neutral state not reached: pos=${state.pos} vibe=${state.vibe} win98=${state.win98}`);
  }
  // The extra body/heading weights the sheet varies over. index.html does not request them;
  // without this link a 400/500 request silently renders the 600 face (the fonts arm proves
  // the real face via canvas width, so a dropped weight reds there).
  await page.evaluate((href) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, FONT_URL_EXTRA);
  if (candidate) await page.addStyleTag({ content: candidate.css });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))),
  );
}

async function readPage(page: Page): Promise<Reads> {
  return page.evaluate(() => {
    const cs = (el: Element): CSSStyleDeclaration => getComputedStyle(el);
    const body = document.body;
    const h2 = document.querySelector(".section h2")!;
    const pageEl = document.querySelector(".page")!;
    const section = document.querySelector(".section")!;
    const p = document.querySelector(".section p")!;
    const link = document.querySelector(".section a")!;
    // The ink probe reads the --ink token the candidates point --heading-color at; the strong
    // rule in app.css consumes the same token but no <strong> exists in the prose.
    const probe = document.createElement("div");
    probe.style.color = "var(--ink)";
    probe.style.display = "none";
    document.body.appendChild(probe);
    const inkProbe = getComputedStyle(probe).color;
    probe.remove();
    // Chars per rendered line: a Range over the LONGEST body paragraph (the first is short,
    // so chars/lines quantizes coarsely by line count), counted by distinct line-box tops —
    // a real geometry read, not px/em arithmetic. Logged for the S3 record; the 60–80 band
    // binds the selected system at S4, not the candidates.
    const longestP = Array.from(document.querySelectorAll(".section p")).reduce(
      (best, el) => ((el.textContent ?? "").length > (best.textContent ?? "").length ? el : best),
      p,
    );
    const range = document.createRange();
    range.selectNodeContents(longestP);
    const tops = new Set(
      Array.from(range.getClientRects())
        .filter((r) => r.width > 0)
        .map((r) => Math.round(r.top)),
    );
    const chars = (longestP.textContent ?? "").replace(/\s+/g, " ").trim().length;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const sample = "mmmmmmmmmmlli";
    const widthAt = (weight: string, family: string): number => {
      ctx.font = `${weight} 72px "${family}"`;
      return ctx.measureText(sample).width;
    };
    const plexWidths: Record<string, number> = {};
    const outfitWidths: Record<string, number> = {};
    for (const w of ["400", "500", "600", "700"]) {
      plexWidths[w] = widthAt(w, "IBM Plex Sans");
      outfitWidths[w] = widthAt(w, "Outfit");
    }
    return {
      bodyWeight: cs(body).fontWeight,
      bodySize: cs(body).fontSize,
      h2Size: cs(h2).fontSize,
      h2Weight: cs(h2).fontWeight,
      h2Color: cs(h2).color,
      h2MarginBottom: cs(h2).marginBottom,
      pageMaxWidth: cs(pageEl).maxWidth,
      sectionMarginTop: cs(section).marginTop,
      pMarginTop: cs(p).marginTop,
      bodyColor: cs(body).color,
      bodyBg: cs(body).backgroundColor,
      linkColor: cs(link).color,
      inkProbe,
      sectionBg: cs(section).backgroundColor,
      pos: getComputedStyle(document.documentElement).getPropertyValue("--pos").trim(),
      vibe: document.documentElement.classList.contains("vibe"),
      win98: document.documentElement.classList.contains("win98"),
      ariaNow: document.querySelector(".spectrum .handle")?.getAttribute("aria-valuenow") ?? null,
      axisLabels: Array.from(document.querySelectorAll(".spectrum .axis-labels span")).map(
        (el) => el.textContent?.trim() ?? "",
      ),
      descriptors: Array.from(document.querySelectorAll(".spectrum .descriptors span")).map(
        (el) => el.textContent?.trim() ?? "",
      ),
      scrollY: window.scrollY,
      scrollWidth: document.documentElement.scrollWidth,
      charsPerLine: tops.size > 0 ? chars / tops.size : 0,
      plexWidths,
      outfitWidths,
      bodyFamily: cs(body).fontFamily,
      h2Family: cs(h2).fontFamily,
    };
  });
}

async function readState(
  desktop: Page,
  mobile: Page,
  key: string,
  candidate?: Candidate,
): Promise<Reading> {
  await gotoNeutral(desktop, candidate);
  const desktopReads = await readPage(desktop);
  const desktopShot = await desktop.screenshot({
    clip: { x: 0, y: 0, width: DESKTOP.width, height: DESKTOP.cropHeight },
  });
  const desktopText = await desktop.locator(".page").innerText();

  await gotoNeutral(mobile, candidate);
  const mobileReads = await readPage(mobile);
  const mobileShot = await mobile.screenshot({
    clip: { x: 0, y: 0, width: MOBILE.width, height: MOBILE.cropHeight },
  });
  const mobileText = await mobile.locator(".page").innerText();

  console.log(
    `contact [${key}] desktop: bodyWeight=${desktopReads.bodyWeight} h2=${desktopReads.h2Size}/${desktopReads.h2Weight} measure=${desktopReads.pageMaxWidth} sectionGap=${desktopReads.sectionMarginTop} paraGap=${desktopReads.pMarginTop} charsPerLine=${desktopReads.charsPerLine.toFixed(1)} scrollWidth=${desktopReads.scrollWidth}`,
  );
  console.log(
    `contact [${key}] mobile: charsPerLine=${mobileReads.charsPerLine.toFixed(1)} scrollWidth=${mobileReads.scrollWidth}`,
  );

  return {
    key,
    desktop: desktopShot,
    mobile: mobileShot,
    desktopText,
    mobileText,
    desktopReads,
    mobileReads,
  };
}

// Collected once in beforeAll; every arm below asserts over this snapshot.
const readings = new Map<string, Reading>();
let sheetWritten = false;

test.beforeAll(async ({ browser }) => {
  const desktopCtx = await browser.newContext({
    viewport: { width: DESKTOP.width, height: DESKTOP.height },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const mobileCtx = await browser.newContext({
    viewport: { width: MOBILE.width, height: MOBILE.height },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const desktop = await desktopCtx.newPage();
  const mobile = await mobileCtx.newPage();

  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no server port");
  url = `http://127.0.0.1:${address.port}${base}`;

  readings.set("baseline", await readState(desktop, mobile, "baseline"));
  for (const c of candidates) {
    readings.set(c.key, await readState(desktop, mobile, c.key, c));
  }

  // Compose the sheet in the browser: one row per candidate — bare letter, fixed-crop desktop
  // and mobile captures side by side. The header states conditions only; no rationale, no
  // recommendation, no recorded values — the artifact precedes the question.
  const rows = candidates.map((c, i) => {
    const d = readings.get(c.key)!.desktop.toString("base64");
    const m = readings.get(c.key)!.mobile.toString("base64");
    return `<div style="display:flex;align-items:flex-start;gap:24px;padding:0 24px 28px">
  <div style="width:56px;flex:none;font:600 40px/1 sans-serif;color:#000;padding-top:8px">${String.fromCharCode(65 + i)}</div>
  <img src="data:image/png;base64,${d}" style="width:${SHEET_DESKTOP_WIDTH}px;height:auto;display:block">
  <img src="data:image/png;base64,${m}" style="width:${SHEET_MOBILE_WIDTH}px;height:auto;display:block">
</div>`;
  });
  const sheetHtml = `<!doctype html><html><body style="margin:0;background:#ffffff">
<div style="padding:20px 24px;font:400 15px/1.5 sans-serif;color:#000">typography contact sheet — round 1 · four candidate reading treatments under identical conditions · family, prose, figures, palette, crop, and scroll position held · desktop 1440px (crop 1350px) · mobile 390px (crop 1688px)</div>
${rows.join("\n")}
</body></html>`;
  await desktop.goto("about:blank");
  await desktop.setViewportSize({ width: 1440, height: 1200 });
  await desktop.setContent(sheetHtml, { waitUntil: "load" });
  await desktop.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
  );
  const sheet = await desktop.screenshot({ fullPage: true });
  await writeFile(join(root, "sheet.png"), sheet);
  for (const [key, r] of readings) {
    await writeFile(join(root, `${key}-desktop.png`), r.desktop);
    await writeFile(join(root, `${key}-mobile.png`), r.mobile);
  }
  sheetWritten = true;

  await desktopCtx.close();
  await mobileCtx.close();
});

// --- Candidate identity ---

test("admissibility: candidate identity — computed reads match each recorded system", async () => {
  for (const c of candidates) {
    const r = readings.get(c.key)!.desktopReads;
    expect(r.bodyWeight, `${c.key} body weight`).toBe(c.recorded.bodyWeight);
    expect(r.bodySize, `${c.key} body size`).toBe(c.recorded.bodySize);
    expect(r.h2Size, `${c.key} heading size`).toBe(c.recorded.headingSize);
    expect(r.h2Weight, `${c.key} heading weight`).toBe(c.recorded.headingWeight);
    expect(r.h2MarginBottom, `${c.key} heading gap`).toBe(c.recorded.headingGap);
    expect(r.pageMaxWidth, `${c.key} measure`).toBe(c.recorded.measure);
    expect(r.sectionMarginTop, `${c.key} section gap`).toBe(c.recorded.sectionGap);
    expect(r.pMarginTop, `${c.key} paragraph gap`).toBe(c.recorded.paraGap);
    // Hierarchy channel: the heading ink moved to the --ink token (never the muted default),
    // and headings are never smaller than body text.
    expect(r.h2Color, `${c.key} heading ink is the ink token`).toBe(r.inkProbe);
    expect(r.h2Color, `${c.key} heading ink differs from body ink`).not.toBe(r.bodyColor);
    expect(
      parseFloat(r.h2Size),
      `${c.key} heading not smaller than body`,
    ).toBeGreaterThanOrEqual(parseFloat(r.bodySize));
    expect(r.h2Family.toLowerCase()).toContain("outfit");
    expect(r.bodyFamily.toLowerCase()).toContain("ibm plex sans");
    // The same system claims the mobile read.
    const m = readings.get(c.key)!.mobileReads;
    expect(m.bodyWeight, `${c.key} mobile body weight`).toBe(c.recorded.bodyWeight);
    expect(m.h2Size, `${c.key} mobile heading size`).toBe(c.recorded.headingSize);
  }
});

// --- Intended-channel variance ---

test("admissibility: candidate pairs vary on the intended channels and in pixels", async () => {
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const ra = readings.get(a.key)!.desktopReads;
      const rb = readings.get(b.key)!.desktopReads;
      const differing: string[] = [];
      const pairs: [string, string, string][] = [
        ["bodyWeight", ra.bodyWeight, rb.bodyWeight],
        ["headingSize", ra.h2Size, rb.h2Size],
        ["headingWeight", ra.h2Weight, rb.h2Weight],
        ["measure", ra.pageMaxWidth, rb.pageMaxWidth],
        ["sectionGap", ra.sectionMarginTop, rb.sectionMarginTop],
        ["paraGap", ra.pMarginTop, rb.pMarginTop],
        ["headingGap", ra.h2MarginBottom, rb.h2MarginBottom],
      ];
      for (const [name, x, y] of pairs) {
        if (x !== y) differing.push(`${name} (${x} vs ${y})`);
      }
      expect(
        differing.length,
        `${a.key}/${b.key} differ on at least one recorded channel: ${differing.join(", ")}`,
      ).toBeGreaterThan(0);
      // Pixel leg at the fixed crop, both viewports. Dimensions match by construction (same
      // clip), so the delta is a same-shape read.
      const dDelta = perceptualDelta(readings.get(a.key)!.desktop, readings.get(b.key)!.desktop);
      const mDelta = perceptualDelta(readings.get(a.key)!.mobile, readings.get(b.key)!.mobile);
      console.log(
        `contact pair ${a.key}/${b.key}: desktop meanDelta=${dDelta.meanDelta.toFixed(2)} extent=${dDelta.extent.toFixed(4)} | mobile meanDelta=${mDelta.meanDelta.toFixed(2)} extent=${mDelta.extent.toFixed(4)} | channels: ${differing.join(", ")}`,
      );
      expect(dDelta.meanDelta, `${a.key}/${b.key} desktop pixels`).toBeGreaterThan(MEAN_FLOOR);
      expect(dDelta.extent, `${a.key}/${b.key} desktop extent`).toBeGreaterThan(EXTENT_FLOOR);
      expect(mDelta.meanDelta, `${a.key}/${b.key} mobile pixels`).toBeGreaterThan(MEAN_FLOOR);
      expect(mDelta.extent, `${a.key}/${b.key} mobile extent`).toBeGreaterThan(EXTENT_FLOOR);
    }
  }
});

// --- Rendered-text identity ---

test("admissibility: rendered text is identical from the baseline through every candidate", async () => {
  const base = readings.get("baseline")!;
  expect(base.desktopText.length).toBeGreaterThan(500);
  for (const c of candidates) {
    const r = readings.get(c.key)!;
    expect(r.desktopText, `${c.key} desktop text`).toBe(base.desktopText);
    expect(r.mobileText, `${c.key} mobile text`).toBe(base.mobileText);
  }
  expect(base.mobileText, "mobile text matches desktop text").toBe(base.desktopText);
});

// --- Palette channels ---

test("admissibility: palette channels are unchanged from the neutral baseline", async () => {
  const base = readings.get("baseline")!.desktopReads;
  for (const c of candidates) {
    const r = readings.get(c.key)!.desktopReads;
    expect(r.bodyColor, `${c.key} body ink`).toBe(base.bodyColor);
    expect(r.bodyBg, `${c.key} body background`).toBe(base.bodyBg);
    expect(r.linkColor, `${c.key} link accent`).toBe(base.linkColor);
    expect(r.sectionBg, `${c.key} section background`).toBe(base.sectionBg);
  }
});

// --- Visualization-state identity ---

test("admissibility: visualization state and crop are unchanged from the neutral baseline", async () => {
  const base = readings.get("baseline")!;
  expect(base.desktopReads.pos).toBe("0.5");
  expect(base.desktopReads.ariaNow).toBe("50");
  for (const c of candidates) {
    for (const view of ["desktop", "mobile"] as const) {
      const r = readings.get(c.key)!;
      const reads = view === "desktop" ? r.desktopReads : r.mobileReads;
      expect(reads.pos, `${c.key} ${view} pos`).toBe("0.5");
      expect(reads.vibe, `${c.key} ${view} vibe class`).toBe(false);
      expect(reads.win98, `${c.key} ${view} win98 class`).toBe(false);
      expect(reads.ariaNow, `${c.key} ${view} aria-valuenow`).toBe("50");
      expect(reads.axisLabels, `${c.key} ${view} axis labels`).toEqual(base.desktopReads.axisLabels);
      expect(reads.descriptors, `${c.key} ${view} descriptors`).toEqual(base.desktopReads.descriptors);
      expect(reads.scrollY, `${c.key} ${view} scroll position`).toBe(0);
      // The crop is pinned, not just claimed: every capture decodes at the baseline's
      // dimensions, so the fixed-crop pixel comparisons above are same-shape reads.
      const shot = view === "desktop" ? r.desktop : r.mobile;
      const dims = decodePng(shot);
      const baseDims = decodePng(base[view]);
      expect([dims.width, dims.height], `${c.key} ${view} crop dimensions`).toEqual([
        baseDims.width,
        baseDims.height,
      ]);
    }
  }
});

// --- Loaded fonts ---

test("admissibility: the recorded body and heading weights render as real faces", async () => {
  for (const c of candidates) {
    const r = readings.get(c.key)!.desktopReads;
    // A missing face silently renders the NEAREST loaded face (canvas font matching), so the
    // requested weight's canvas width must differ from every other loaded weight's width. Plex:
    // 400/500 come from FONT_URL_EXTRA, 600/700 from index.html — all four loaded. Outfit:
    // index.html loads 500/600, FONT_URL_EXTRA adds 700 — the 400 face is not requested, so the
    // comparison set excludes it (an unloaded 400 coinciding with 500 is expected, not a bug).
    expect(r.bodyFamily.toLowerCase()).toContain("ibm plex sans");
    const plexAll = ["400", "500", "600", "700"];
    for (const w of plexAll) {
      if (w === c.recorded.bodyWeight) continue;
      const gap = Math.abs(r.plexWidths[c.recorded.bodyWeight] - r.plexWidths[w]);
      console.log(
        `contact fonts [${c.key}]: Plex ${c.recorded.bodyWeight} width=${r.plexWidths[c.recorded.bodyWeight].toFixed(2)} vs ${w} width=${r.plexWidths[w].toFixed(2)} gap=${gap.toFixed(2)}`,
      );
      expect(
        gap,
        `${c.key} IBM Plex Sans ${c.recorded.bodyWeight} face rendered (distinct from ${w})`,
      ).toBeGreaterThan(0.1);
    }

    expect(r.h2Family.toLowerCase()).toContain("outfit");
    const outfitLoaded = ["500", "600", "700"];
    for (const w of outfitLoaded) {
      if (w === c.recorded.headingWeight) continue;
      const gap = Math.abs(r.outfitWidths[c.recorded.headingWeight] - r.outfitWidths[w]);
      expect(
        gap,
        `${c.key} Outfit ${c.recorded.headingWeight} face rendered (distinct from ${w})`,
      ).toBeGreaterThan(0.1);
    }
  }
});

// --- No horizontal overflow ---

test("admissibility: no horizontal overflow at either viewport", async () => {
  for (const [key, r] of readings) {
    expect(r.desktopReads.scrollWidth, `${key} desktop scrollWidth`).toBeLessThanOrEqual(
      DESKTOP.width,
    );
    expect(r.mobileReads.scrollWidth, `${key} mobile scrollWidth`).toBeLessThanOrEqual(
      MOBILE.width,
    );
  }
});

// --- Sheet artifact ---

test("artifact: contact sheet written with all four candidate rows", async () => {
  expect(sheetWritten).toBe(true);
  const buf = await readFile(join(root, "sheet.png"));
  const png = decodePng(buf);
  // Grounded in the actual capture dimensions, not layout arithmetic: each desktop capture is
  // baseDims.width×baseDims.height device px (the fixed crop, clamped to the viewport),
  // displayed at SHEET_DESKTOP_WIDTH css px, and the sheet screenshot runs at the same device
  // scale factor as the captures — so one row occupies round(baseDims.height ×
  // SHEET_DESKTOP_WIDTH / baseDims.width) sheet-device px, and the header/padding only add
  // height above that. A sheet missing a row falls one full row short of the floor.
  const baseDims = decodePng(readings.get("baseline")!.desktop);
  const sheetDsf = png.width / 1440; // the sheet page's viewport is 1440 css px wide
  const rowDeviceHeight = Math.round(
    (baseDims.height * SHEET_DESKTOP_WIDTH * sheetDsf) / baseDims.width,
  );
  const minHeight = candidates.length * rowDeviceHeight;
  console.log(
    `contact sheet: ${png.width}x${png.height} (row ${rowDeviceHeight} device px, min height ${minHeight})`,
  );
  expect(png.width).toBeGreaterThanOrEqual(1300);
  expect(png.height).toBeGreaterThanOrEqual(minHeight);
  // The four embedded desktop captures are pairwise byte-distinct — identity at the artifact
  // layer, independent of the computed reads.
  const caps = candidates.map((c) => readings.get(c.key)!.desktop);
  for (let i = 0; i < caps.length; i++) {
    for (let j = i + 1; j < caps.length; j++) {
      expect(
        caps[i].equals(caps[j]),
        `captures ${candidates[i].key}/${candidates[j].key} distinct`,
      ).toBe(false);
    }
  }
});
