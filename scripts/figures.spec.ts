import { createServer, type Server } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { pixelProbePass, probePixels, type PixelProbe } from "./shallot-pixels";
import { decodePng, perceptualDelta } from "./png";
import { figures } from "./manifest";
import { assertVaries } from "./variance";
import { assertReducedMotion } from "./reduced";
import { grammar } from "./vocabulary";

// Figure gate for the neutral article template. The sequence-shell arms retired with the
// WebGPU hero in S1, together with the real-tree vocabulary arm whose subject went with it
// (the role binding is the vocabulary oracle's owned red until S4). What remains: the
// substrate arm, the server contract, typography, readable measure, emphasis, rhythm, and
// non-interference.

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const base = "/agentic-engineering/";
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp4": "video/mp4",
  ".ico": "image/x-icon", ".json": "application/json", ".map": "application/json",
};
let server: Server; let url: string;
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    let path = new URL(req.url ?? "/", "http://localhost").pathname;
    path = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, "");
    if (path === "" || path.endsWith("/")) path = "index.html";
    try {
      const body = await readFile(join(dist, path));
      res.writeHead(200, { "content-type": types[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end(`missing asset: ${path}`);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no server port");
  url = `http://127.0.0.1:${address.port}${base}`;
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

test("substrate: dist contains no Shallot or typegpu", async () => {
  const readTree = async (path: string): Promise<string[]> => {
    const entries = await readdir(path, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory()
      ? readTree(join(path, entry.name))
      : readFile(join(path, entry.name), "utf8").catch(() => "")))).flat();
  };
  const built = (await readTree(dist)).join("\n").toLowerCase();
  expect(built).not.toMatch(/(?:from|import\()\s*["\'](?:@dylanebert\/shallot|typegpu|unplugin-typegpu)/);
  expect(built).not.toMatch(/<iframe|https?:\/\/(?:localhost|127\.0\.0\.1):\d+|\bvite\s+(?:dev|serve|preview)\b/);
});

// --- Server contract: missing assets 404 (no SPA fallback masking) ---

// The figures server is the gate's only view of the built page; a fallback that serves
// index.html for a missing asset turns a broken script/stylesheet/font request into a 200
// carrying HTML. This arm pins the server's missing-asset 404 behavior — nothing broader:
// traversal handling is not claimed here.
// Mutation: revert the catch to the old `path = "index.html"` fallback and the probed status
// reads 200 — red.
test("server: missing assets return 404, not an index.html fallback", async ({ request }) => {
  const response = await request.get(`${url}missing-asset.probe`);
  console.log(`missing-asset probe: status=${response.status()}`);
  expect(response.status()).toBe(404);
});

// S4 structural typography arms. These read the neutral page as rendered, rather than checking
// token spelling. The values are deliberately independent of the temporary round-1 sheet: this
// is the selected treatment's contract, not a copy of a candidate's record.
test("typography: neutral hierarchy keeps headings at body size", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => getComputedStyle(document.body).fontWeight === "400");
  const reads = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const title = getComputedStyle(document.querySelector(".title")!);
    const heading = getComputedStyle(document.querySelector(".section h2")!);
    return {
      bodySize: parseFloat(body.fontSize),
      bodyWeight: body.fontWeight,
      titleSize: parseFloat(title.fontSize),
      headingSize: parseFloat(heading.fontSize),
      headingWeight: heading.fontWeight,
    };
  });
  console.log(`neutral hierarchy: body=${reads.bodySize}px/${reads.bodyWeight} heading=${reads.headingSize}px/${reads.headingWeight} title=${reads.titleSize}px`);
  expect(reads.headingSize).toBeGreaterThanOrEqual(reads.bodySize);
  expect(reads.titleSize).toBeGreaterThan(reads.headingSize);
  expect(reads.bodyWeight).toBe("400");
  expect(reads.headingWeight).toBe("600");
});

test("typography: neutral measure stays in the readable long-form band", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const reads = await page.evaluate(() => {
    const lineLengths: number[] = [];
    for (const paragraph of document.querySelectorAll(".page .section p")) {
      const lines = new Map<number, number>();
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? "";
        for (let offset = 0; offset < text.length; offset += 1) {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset + 1);
          const rect = range.getBoundingClientRect();
          if (rect.width === 0) continue;
          const top = Math.round(rect.top);
          lines.set(top, (lines.get(top) ?? 0) + 1);
        }
      }
      const values = [...lines.values()];
      lineLengths.push(...values.slice(0, -1));
    }
    const pageBox = document.querySelector(".page")!.getBoundingClientRect();
    return {
      maximumNonFinalLine: Math.max(...lineLengths),
      pageWidth: pageBox.width,
      viewportWidth: window.innerWidth,
    };
  });
  console.log(`neutral measure: maximumNonFinalLine=${reads.maximumNonFinalLine} pageWidth=${reads.pageWidth} viewport=${reads.viewportWidth}`);
  // This is the standing portability contract, intentionally broader than S5's one-off
  // local selection arm below.
  expect(reads.maximumNonFinalLine).toBeGreaterThanOrEqual(60);
  expect(reads.maximumNonFinalLine).toBeLessThanOrEqual(75);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const page = document.querySelector(".page")!;
    const box = page.getBoundingClientRect();
    const styles = getComputedStyle(page);
    return {
      left: box.left,
      right: box.right,
      width: box.width,
      paddingLeft: parseFloat(styles.paddingLeft),
      paddingRight: parseFloat(styles.paddingRight),
      viewport: window.innerWidth,
    };
  });
  console.log(`mobile measure: page=${mobile.width}px padding=${mobile.paddingLeft}px/${mobile.paddingRight}px`);
  expect(mobile.width).toBe(mobile.viewport);
  expect(mobile.paddingLeft).toBe(20);
  expect(mobile.paddingRight).toBe(20);
});

// The measure is a constant (spec Out of scope: type and measure stay as shipped), so this arm
// asserts the property that constant is chosen for: at the shipped 548px the longest rendered
// line stays inside the readable band. The former "and 549px exceeds it" half asserted a
// property of the specific character stream rather than of the measure, so every prose rewrite
// moved it and no stage owned it; it reddened on the S2 rebuild at 74 characters. Its mutation
// witness in scripts/instrument.ts now breaches the measure constant instead of the sweep width.
test("typography: shipped desktop measure keeps the longest line inside the readable band", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const sweep = await page.evaluate(() => {
    const readMaximum = (width: number): number => {
      const style = document.createElement("style");
      style.textContent = `.page { max-width: ${width}px !important; }`;
      document.head.append(style);
      const lineLengths: number[] = [];
      for (const paragraph of document.querySelectorAll(".page .section p")) {
        const lines = new Map<number, number>();
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = node.textContent ?? "";
          for (let offset = 0; offset < text.length; offset += 1) {
            const range = document.createRange();
            range.setStart(node, offset);
            range.setEnd(node, offset + 1);
            const rect = range.getBoundingClientRect();
            if (rect.width === 0) continue;
            const top = Math.round(rect.top);
            lines.set(top, (lines.get(top) ?? 0) + 1);
          }
        }
        lineLengths.push(...[...lines.values()].slice(0, -1));
      }
      style.remove();
      return Math.max(...lineLengths);
    };
    const selected = readMaximum(548);
    return {
      current: document.querySelector(".page")!.getBoundingClientRect().width,
      selected,
    };
  });
  console.log(`neutral measure selection: current=${sweep.current}px, 548px max=${sweep.selected}`);
  expect(sweep.current).toBe(548);
  expect(sweep.selected).toBeLessThanOrEqual(75);
  expect(sweep.selected).toBeGreaterThanOrEqual(72);
});

test("typography: production strong emphasis and section rhythm are visible on the neutral canvas", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--pos", "0.5");
    document.documentElement.classList.remove("vibe", "win98");
    const paragraph = document.querySelector(".section p")!;
    const strong = document.createElement("strong");
    strong.dataset.figureProbe = "strong-emphasis";
    strong.textContent = "strong emphasis";
    strong.style.display = "inline-block";
    strong.style.width = "120px";
    strong.style.height = "26px";
    paragraph.append(" ", strong);
  });
  const styles = await page.evaluate(() => {
    const paragraph = document.querySelector(".section p")!;
    const strong = paragraph.querySelector("strong")!;
    const body = getComputedStyle(paragraph);
    const emphasized = getComputedStyle(strong);
    return {
      paragraphColor: body.color,
      paragraphWeight: body.fontWeight,
      emphasisColor: emphasized.color,
      emphasisWeight: emphasized.fontWeight,
    };
  });
  console.log(`strong emphasis: body=${styles.paragraphWeight}/${styles.paragraphColor} strong=${styles.emphasisWeight}/${styles.emphasisColor}`);
  expect(styles.emphasisWeight).toBe("600");
  expect(styles.emphasisColor).not.toBe(styles.paragraphColor);

  const strong = page.locator('strong[data-figure-probe="strong-emphasis"]');
  const emphasized = await strong.screenshot();
  await strong.evaluate((element) => {
    const paragraph = element.closest("p")!;
    const paragraphStyle = getComputedStyle(paragraph);
    const plain = element as HTMLElement;
    plain.style.fontWeight = paragraphStyle.fontWeight;
    plain.style.color = paragraphStyle.color;
    plain.style.textShadow = "none";
  });
  const plain = await strong.screenshot();
  const emphasisDelta = perceptualDelta(plain, emphasized);
  console.log(`production strong emphasis canvas: meanDelta=${emphasisDelta.meanDelta.toFixed(2)} extent=${emphasisDelta.extent.toFixed(4)}`);
  expect(emphasisDelta.meanDelta).toBeGreaterThan(3);

  const rhythm = await page.evaluate(() => {
    const sections = [...document.querySelectorAll(".page .section")];
    const gaps = sections.slice(1).map((section, index) => {
      const previousParagraph = sections[index].querySelector("p:last-of-type")!.getBoundingClientRect();
      const heading = section.querySelector("h2")!.getBoundingClientRect();
      return heading.top - previousParagraph.bottom;
    });
    return { gaps, paragraphGap: parseFloat(getComputedStyle(sections[0].querySelector("p")!).marginTop) };
  });
  console.log(`neutral rhythm: gaps=${rhythm.gaps.map((gap) => gap.toFixed(1)).join(",")} paragraphGap=${rhythm.paragraphGap}`);
  for (const gap of rhythm.gaps) expect(gap).toBeGreaterThan(rhythm.paragraphGap * 2.5);
});

// The neutral-template repair must not alter the story or placeholder geometry.
test("non-interference: story text remains intact", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await page.evaluate(() => ({
    text: (document.querySelector(".page") as HTMLElement).innerText,
  }));
  expect(result.text).toContain("Agentic engineering is directing agents to make software.");
  expect(result.text).toContain("Verifiability is how well those questions can be answered");
  expect(result.text).toContain("The application of these principles is agentic engineering.");
});

// --- H3 hero register and degradation ---

test("hero: exactly one unlabeled three-state hero sits above the opening", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const read = await page.evaluate(() => {
    const heroes = [...document.querySelectorAll("[data-hero-id]")];
    const hero = heroes[0]; const opening = document.querySelector("section.section");
    return { count: heroes.length, states: hero ? [...hero.querySelectorAll("rect[data-hero-state]")].map((n) => n.getAttribute("data-hero-state")) : [], labels: hero?.querySelectorAll("[data-figure-label],figcaption").length ?? -1, canvases: hero?.querySelectorAll("canvas").length ?? 0, above: !!hero && !!opening && (hero.compareDocumentPosition(opening) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 };
  });
  console.log(`hero register: ${JSON.stringify(read)}`);
  expect(read).toEqual({ count: 1, states: ["human", "agentic", "vibe"], labels: 0, canvases: 1, above: true });
});

test("hero: reduced motion rests on the captured agentic frame", async ({ page }) => {
  const result = await assertReducedMotion(page, '[data-hero-id="spectrum-hero"]', async (target, step) => { if (step === 0) await target.goto(url, { waitUntil: "networkidle" }); }, 1);
  const read = await page.locator('[data-hero-id="spectrum-hero"]').evaluate((element) => ({ phase: getComputedStyle(element).getPropertyValue("--phase").trim(), rows: element.querySelector("pre")?.textContent?.split("\n").length, state: element.getAttribute("data-hero-state") }));
  console.log(`hero reduced rest: ${JSON.stringify(read)}`); expect(result.pass).toBe(true); expect(read).toEqual({ phase: "1", rows: 14, state: "agentic" });
});

test("hero: DOM spectrum uses strokes without area tint", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const fills = await page.locator('[data-hero-id] path, [data-hero-id] rect').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
  expect(fills.every((fill) => fill === "none")).toBe(true);
});

// Five H3 mutations terminate here: fallback copy changes body text; deleting the no-adapter
// branch hides the captured pre; a transparent canvas fails both probes; removing GlazePlugin
// or the explicit state.step leaves sear's offscreen frame absent from the composited screenshot.
test("hero: real WebGPU acquisition draws a composited, varying cube and plain Chromium keeps silent rest", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (window as any).__webgpuCalls = 0;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (args[0] === "webgpu") (window as any).__webgpuCalls++;
      return original.apply(this, args);
    } as typeof original;
  });
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  const hero = page.locator('[data-hero-id="spectrum-hero"]');
  const initialText = await page.locator("body").innerText();
  if (testInfo.project.name === "chromium-webgpu") {
    await expect(hero).toHaveAttribute("data-hero-gpu", "drawn", { timeout: 30000 });
    expect(await hero.locator("canvas").count()).toBe(1);
    expect(await page.evaluate(() => (window as any).__webgpuCalls)).toBe(1);
    const first = await hero.locator("canvas").screenshot();
    await page.waitForTimeout(700);
    const second = await hero.locator("canvas").screenshot();
    const decoded = decodePng(first);
    const probes: PixelProbe[] = [
      { name: "scene field", minPixels: 1000, minSpan: 100, r: [0, 70], g: [0, 70], b: [0, 70] },
      { name: "treated cube", minPixels: 100, minSpan: 20, r: [20, 255], g: [20, 255], b: [20, 255] },
    ];
    for (const probe of probes) {
      const result = probePixels(decoded.data, decoded.width, decoded.height, probe);
      console.log(`hero ${probe.name}: ${JSON.stringify(result)}`);
      expect(pixelProbePass(result, probe)).toBe(true);
    }
    const variance = perceptualDelta(first, second);
    console.log(`hero canvas variance=${JSON.stringify(variance)}`);
    expect(variance.maxDelta).toBeGreaterThan(3);
    expect(variance.extent).toBeGreaterThan(0.001);
  } else {
    await expect(hero.locator("pre")).toBeVisible();
    await expect(hero).not.toHaveAttribute("data-hero-gpu", "drawn");
    await page.waitForTimeout(700);
    expect(await page.locator("body").innerText()).toBe(initialText);
    expect(await page.evaluate(() => (window as any).__webgpuCalls)).toBe(0);
  }
  expect(errors).toEqual([]);
});

test("hero: three rendered treatments match the occupied state, identify Cells live, and clear pairwise JND", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-webgpu");
  await page.goto(url, { waitUntil: "networkidle" });
  const hero = page.locator('[data-hero-id="spectrum-hero"]');
  await expect(hero).toHaveAttribute("data-hero-gpu", "drawn", { timeout: 30000 });
  const states = ["agentic", "vibe", "human"] as const;
  const captures = new Map<string, Buffer>();
  for (const state of states) {
    await expect.poll(async () => {
      const read = await hero.evaluate((element) => ({ state: element.getAttribute("data-hero-state"), treatment: element.getAttribute("data-hero-treatment") }));
      return `${read.state}/${read.treatment}`;
    }, { timeout: 20000 }).toBe(`${state}/${state}`);
    const cells = await hero.getAttribute("data-hero-cells");
    if (state === "agentic") expect(cells).toMatch(/^\d+x\d+$/);
    else expect(cells).toBeNull();
    captures.set(state, await hero.locator("canvas").screenshot());
  }
  const deltas = [["human", "agentic"], ["human", "vibe"], ["agentic", "vibe"]].map(([a, b]) => ({ pair: `${a}/${b}`, ...perceptualDelta(captures.get(a)!, captures.get(b)!) }));
  console.log(`hero treatment JND: ${JSON.stringify(deltas)}`);
  for (const delta of deltas) {
    expect(delta.maxDelta, delta.pair).toBeGreaterThan(3);
    expect(delta.extent, delta.pair).toBeGreaterThan(0.001);
  }
  expect(await hero.locator("[data-figure-label],figcaption").count()).toBe(0);
});

// --- S3 figure arms ---
//
// The manifest (src/lib/figures.ts, staged beside this spec as manifest.ts) is the external
// expectation these arms read: the page is checked against the declaration, never against
// itself. Each arm below carries the mutation that reds it, run once at S3 and recorded.

// Mutation: delete the <StageLoop /> mount from App.svelte and the count reads 1 against the
// manifest's 2 — red. Mutation: change an entry's paragraph index to 0 and the site read for
// that figure moves to 0 against the declared 1 — red.
test("figures: exactly the manifest's figures, each mounted at its declared site", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const reads = await page.evaluate(() => {
    const sited = [...document.querySelectorAll("figure")].map((figure) => {
      const section = figure.closest("section.section");
      const previous = figure.previousElementSibling;
      const paragraphs = section ? [...section.querySelectorAll(":scope > p")] : [];
      return {
        id: figure.getAttribute("data-figure-id"),
        section: section?.id ?? null,
        // The index of the paragraph the figure sits immediately after, among its section's own.
        paragraph: previous === null ? -1 : paragraphs.indexOf(previous as HTMLParagraphElement),
      };
    });
    return { sited, total: document.querySelectorAll("figure").length };
  });
  console.log(`figure sites: ${JSON.stringify(reads.sited)} total=${reads.total}`);
  expect(reads.total).toBe(figures.length);
  expect(reads.sited).toEqual(figures.map((entry) => ({ id: entry.id, section: entry.section, paragraph: entry.paragraph })));
});

// The paragraph before a figure does the caption's job, so it must actually carry the claim the
// manifest quotes for that figure.
// Mutation: mount the spectrum figure one paragraph later (after the "The space is wide"
// paragraph) and its lead-in no longer contains the quoted claim — red.
test("figures: each figure is immediately preceded by a paragraph carrying its quoted claim", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const leadIns = await page.evaluate(() => {
    // The rendered text of a node, whitespace-collapsed the way a reader sees it.
    const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();
    return [...document.querySelectorAll("figure")].map((figure) => {
      const previous = figure.previousElementSibling;
      return {
        id: figure.getAttribute("data-figure-id"),
        tag: previous?.tagName ?? null,
        text: normalize(previous?.textContent ?? ""),
      };
    });
  });
  for (const entry of figures) {
    const leadIn = leadIns.find((read) => read.id === entry.id);
    console.log(`lead-in ${entry.id}: <${leadIn?.tag}> "${(leadIn?.text ?? "").slice(0, 60)}…"`);
    expect(leadIn, `no figure mounted for manifest entry ${entry.id}`).toBeDefined();
    expect(leadIn!.tag).toBe("P");
    expect(leadIn!.text).toContain(entry.claim);
  }
});

// Figure register (spec validation 5): the reference set carries no figcaptions, and no figure
// stands above the prose it illustrates.
// Mutation: add a <figcaption> inside Figure.svelte and the count reads 1 — red. Mutation: mount
// a figure in the page header and the first figure no longer follows the opening section — red.
// The two placement legs are the same property at two strengths: every section on this page
// carries the .section class, so a figure above the opening section is necessarily outside every
// section. The ordering leg is asserted first so the header mutation reds on the named property;
// the containment leg is the stronger form and reds on the same input one assertion later.
test("figures: no figcaption anywhere, and no figure above the opening section", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const register = await page.evaluate(() => {
    const first = document.querySelector("figure");
    const opening = document.querySelector(".page .section");
    return {
      figcaptions: document.querySelectorAll("figcaption").length,
      orphans: [...document.querySelectorAll("figure")].filter((figure) => figure.closest("section.section") === null).length,
      firstFollowsOpening:
        first !== null &&
        opening !== null &&
        (opening.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      openingSection: opening?.id ?? null,
    };
  });
  console.log(`figure register: figcaptions=${register.figcaptions} orphans=${register.orphans} firstFollowsOpening=${register.firstFollowsOpening} opening=${register.openingSection}`);
  expect(register.figcaptions).toBe(0);
  expect(register.firstFollowsOpening).toBe(true);
  expect(register.orphans).toBe(0);
});

// Ordered geometry for what is arranged (taste.md, one assertion per claim-kind). The expected
// The expected order comes from the prose, not from the component: the loop runs spec → stage →
// verify with a return edge spanning back from the last node to the middle one. The spec is
// written once, so only stage and verify are inside the repeat.
const ORDERS: Record<string, readonly string[]> = {
  "stage-loop": ["spec", "stage", "verify"],
};

test("figures: arranged parts read left to right in the order the prose states", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const geometry = await page.evaluate(() => {
    const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();
    const read: Record<string, { labels: string[]; span: { left: number; right: number } | null; nodes: { left: number; right: number }[] }> = {};
    for (const figure of document.querySelectorAll("figure")) {
      const id = figure.getAttribute("data-figure-id") ?? "";
      const parts = [...figure.querySelectorAll('[data-figure-part="position"], [data-figure-part="node"]')].map((part) => {
        const box = part.getBoundingClientRect();
        return {
          label: normalize(part.querySelector("[data-figure-label]")?.textContent ?? ""),
          center: (box.left + box.right) / 2,
          left: box.left,
          right: box.right,
        };
      });
      parts.sort((a, b) => a.center - b.center);
      const edge = figure.querySelector('[data-figure-part="return-edge"]');
      const edgeBox = edge?.getBoundingClientRect() ?? null;
      read[id] = {
        labels: parts.map((part) => part.label),
        span: edgeBox === null ? null : { left: edgeBox.left, right: edgeBox.right },
        nodes: parts.map((part) => ({ left: part.left, right: part.right })),
      };
    }
    return read;
  });
  for (const entry of figures) {
    const read = geometry[entry.id];
    console.log(`ordered geometry ${entry.id}: ${JSON.stringify(read?.labels)}`);
    expect(read, `no rendered figure for ${entry.id}`).toBeDefined();
    expect(read.labels).toEqual([...ORDERS[entry.id]]);
  }
  // The loop's return edge runs back from the last node to the middle one, so it spans them both
  // and stops short of the first: the spec is not inside the repeat.
  const loop = geometry["stage-loop"];
  console.log(`return edge span: ${JSON.stringify(loop.span)} nodes=${JSON.stringify(loop.nodes)}`);
  expect(loop.span).not.toBeNull();
  expect(loop.span!.left).toBeGreaterThan(loop.nodes[0].right);
  expect(loop.span!.right).toBeGreaterThanOrEqual((loop.nodes[2].left + loop.nodes[2].right) / 2);
});

// Claim fidelity for the loop's one asserted ordering (criterion 12): the prose writes the spec
// once and then says "repeat: stage, verify, stage again", so the arrow closing the cycle has to
// land on `stage`. Terminating it at `spec` would publicly assert a structure the prose does not
// claim, and the span check above is too coarse to see it. This arm reads the path's own final
// point, transformed into client space, and requires it inside the stage node's horizontal
// extent.
// Mutation: move the return edge's last two x coordinates back to 88 in StageLoop.svelte and the
// endpoint lands on the spec node — red.
test("figures: the loop's return edge lands on the stage node, not the spec", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const read = await page.evaluate(() => {
    const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();
    const figure = document.querySelector('figure[data-figure-id="stage-loop"]');
    if (figure === null) return null;
    const edge = figure.querySelector('[data-figure-part="return-edge"]');
    if (!(edge instanceof SVGGeometryElement)) return null;
    const matrix = edge.getScreenCTM();
    if (matrix === null) return null;
    const local = edge.getPointAtLength(edge.getTotalLength());
    const point = new DOMPoint(local.x, local.y).matrixTransform(matrix);
    const nodes = [...figure.querySelectorAll('[data-figure-part="node"]')].map((part) => {
      const box = part.getBoundingClientRect();
      return { label: normalize(part.querySelector("[data-figure-label]")?.textContent ?? ""), left: box.left, right: box.right };
    });
    return { end: { x: point.x, y: point.y }, nodes };
  });
  console.log(`return edge endpoint: ${JSON.stringify(read)}`);
  expect(read, "no rendered stage-loop return edge").not.toBeNull();
  const stage = read!.nodes.find((node) => node.label === "stage");
  expect(stage, "no stage node in the loop figure").toBeDefined();
  expect(read!.end.x).toBeGreaterThanOrEqual(stage!.left);
  expect(read!.end.x).toBeLessThanOrEqual(stage!.right);
});

// Content assertion for what is named: a figure may only use words in its quoted claim, so the
// progressive disclosure has finished before the figure appears. The loop also declares its
// return action as "repeat". Comparison is case-insensitive because labels use lowercase.
// Mutation: rename the verify label to "validate", or remove "repeat" from the claim — red.
test("figures: every figure label and return action is a substring of its claim", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const reads = await page.evaluate(() => {
    const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();
    return [...document.querySelectorAll("figure")].map((figure) => {
      const section = figure.closest("section.section");
      const prose = section === null
        ? ""
        : normalize([...section.querySelectorAll(":scope > p, :scope > ul")].map((node) => node.textContent ?? "").join(" "));
      return {
        id: figure.getAttribute("data-figure-id") ?? "",
        prose: prose.toLowerCase(),
        labels: [...figure.querySelectorAll("[data-figure-label]")].map((label) => normalize(label.textContent ?? "").toLowerCase()),
      };
    });
  });
  for (const read of reads) {
    const entry = figures.find((figure) => figure.id === read.id);
    expect(entry, `no manifest entry for ${read.id}`).toBeDefined();
    const claim = entry!.claim.toLowerCase();
    console.log(`claim labels ${read.id}: ${JSON.stringify(read.labels)} repeat=${claim.includes("repeat")}`);
    expect(read.labels.length).toBeGreaterThan(0);
    for (const label of read.labels) {
      expect(label.length).toBeGreaterThan(0);
      expect(claim, `label "${label}" is not in ${read.id}'s claim`).toContain(label);
    }
    expect(claim).toContain("repeat");
    expect(read.prose).toContain(entry!.claim.toLowerCase());
  }
});


// --- S4 motion and prose binding arms ---
//
// Every figure's motion is a CSS function of one number: `--phase`, 0 to 1 over the cycle,
// published on the figure element by Figure.svelte and pinned at 1 — the fully drawn resting
// state — under reduced motion. So a figure can be read at any point of its cycle by setting
// that property, which is what the variance driver below does.

const figureSelector = (id: string): string => `figure[data-figure-id="${id}"]`;

const phaseDriver = (id: string, steps: number) => async (page: import("@playwright/test").Page, step: number) => {
  if (step === 0) await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(figureSelector(id)).evaluate((element, value) => {
    (element as HTMLElement).style.setProperty("--phase", value);
  }, String(step / (steps - 1)));
};

test("figures: every loop connector meets its node edges and remains visible", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const read = await page.locator(figureSelector("stage-loop")).evaluate((element) => {
    const point = (line: SVGLineElement, end: "start" | "end") => {
      const matrix = line.getScreenCTM()!;
      const x = end === "start" ? line.x1.baseVal.value : line.x2.baseVal.value;
      const y = end === "start" ? line.y1.baseVal.value : line.y2.baseVal.value;
      return new DOMPoint(x, y).matrixTransform(matrix);
    };
    const nodes = [...element.querySelectorAll<SVGRectElement>("rect.node")].map((node) => node.getBoundingClientRect());
    const lines = [...element.querySelectorAll<SVGLineElement>("line.edge")];
    const gaps = [
      Math.abs(point(lines[0], "start").x - nodes[0].right),
      Math.abs(point(lines[0], "end").x - nodes[1].left),
      Math.abs(point(lines[1], "start").x - nodes[1].right),
      Math.abs(point(lines[1], "end").x - nodes[2].left),
    ];
    const phases = [0, 0.25, 0.5, 0.75, 1];
    const visibility = phases.map((phase) => {
      (element as HTMLElement).style.setProperty("--phase", String(phase));
      return [...element.querySelectorAll<SVGGeometryElement>(".edge.base")].map((edge) => {
        const style = getComputedStyle(edge);
        return { opacity: Number(style.opacity), width: Number(style.strokeWidth.replace("px", "")) };
      });
    });
    return { gaps, visibility };
  });
  console.log(`loop connector geometry: ${JSON.stringify(read)}`);
  expect(Math.max(...read.gaps)).toBeLessThanOrEqual(0.5);
  expect(read.visibility.flat().every(({ opacity, width }) => opacity > 0 && width > 0)).toBe(true);
});

test("figures: the loop indicator approaches nodes at non-constant speed", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const distances = await page.locator(figureSelector("stage-loop")).evaluate((element) => {
    const positions: { x: number; y: number }[] = [];
    for (let index = 0; index <= 20; index += 1) {
      (element as HTMLElement).style.setProperty("--phase", String(index / 40));
      const box = element.querySelector<SVGCircleElement>('[data-figure-part="unit"]')!.getBoundingClientRect();
      positions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }
    return positions.slice(1).map((position, index) => Math.hypot(position.x - positions[index].x, position.y - positions[index].y));
  });
  console.log(`loop indicator phase distances: ${distances.map((distance) => distance.toFixed(3)).join(",")}`);
  expect(Math.max(...distances) - Math.min(...distances)).toBeGreaterThan(0.5);
});

// Perceptual variance over a JND for the one traveling unit. The structural reads beside it pin
// the three distinct channels: position advances spec → stage → verify → stage, occupied nodes
// gain an emphasis stroke, and the return edge reveals by dash offset.
test("figures: one unit travels spec to stage to verify to stage with stroke emphasis and a dashed return", async ({ page }) => {
  const phases = [0, 186 / 668, 372 / 668, 1];
  await page.goto(url, { waitUntil: "networkidle" });
  const reads = [];
  for (const phase of phases) {
    const read = await page.locator(figureSelector("stage-loop")).evaluate((element, value) => {
      (element as HTMLElement).style.setProperty("--phase", String(value));
      const unit = element.querySelector('[data-figure-part="unit"]')!.getBoundingClientRect();
      const emphasis = [...element.querySelectorAll<SVGElement>(".emphasis")].map((node) => {
        const box = node.getBoundingClientRect();
        return {
          node: node.dataset.node,
          opacity: Number(getComputedStyle(node).opacity),
          center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        };
      });
      const edge = getComputedStyle(element.querySelector('[data-figure-part="return-edge"]')!);
      const fills = [...element.querySelectorAll("rect, circle, path, line")].map((node) => getComputedStyle(node).fill);
      return { unit: { x: unit.x + unit.width / 2, y: unit.y + unit.height / 2 }, emphasis, dash: parseFloat(edge.strokeDashoffset), fills };
    }, phase);
    reads.push(read);
  }
  console.log(`loop channels: ${JSON.stringify(reads)}`);
  expect(reads.every((read) => read.fills.every((fill) => fill === "none"))).toBe(true);
  expect(reads.map((read) => read.emphasis.find((node) => node.opacity > 0.9)?.node)).toEqual(["spec", "stage", "verify", "stage"]);
  for (const read of reads.slice(0, 3)) {
    const landed = read.emphasis.find((node) => node.opacity > 0.9)!;
    expect(Math.hypot(read.unit.x - landed.center.x, read.unit.y - landed.center.y)).toBeLessThanOrEqual(0.5);
  }
  expect(reads[0].unit.x).toBeLessThan(reads[1].unit.x);
  expect(reads[1].unit.x).toBeLessThan(reads[2].unit.x);
  expect(reads[3].unit.x).toBeLessThan(reads[2].unit.x);
  expect(reads[3].unit.y).toBeGreaterThan(reads[2].unit.y);
  expect(reads.slice(0, 3).every((read) => read.dash === 100)).toBe(true);
  expect(reads[3].dash).toBe(0);

  const steps = 4;
  const result = await assertVaries(page, figureSelector("stage-loop"), phaseDriver("stage-loop", steps), steps);
  console.log(`loop variance: steps=${result.steps} failures=${JSON.stringify(result.failures)}`);
  expect(result.pass, result.failures.map((failure) => failure.reason).join("; ")).toBe(true);
});

// Reduced-motion rest (spec validation 7). Each figure is fully drawn and byte-stable: no
// animation in flight, consecutive frames pixel-identical, and the subtree non-trivial. The
// phase read is the "fully drawn" half — at rest the cycle sits at its end, not at its start,
// so every part the motion reveals is present.
// Mutation: delete Figure.svelte's `if (reduced) return;` and the clock ticks under reduced
// motion, so the frames differ — red (instrument.ts, "reduced-motion rest").
test("figures: reduced-motion rest is fully drawn and byte-stable", async ({ page }) => {
  for (const entry of figures) {
    const selector = figureSelector(entry.id);
    const result = await assertReducedMotion(page, selector, async (target, step) => {
      if (step === 0) await target.goto(url, { waitUntil: "networkidle" });
    }, 1);
    const rest = await page.locator(selector).evaluate((element) => ({
      phase: getComputedStyle(element).getPropertyValue("--phase").trim(),
      occupied: [...element.querySelectorAll<SVGElement>(".emphasis")]
        .filter((node) => Number(getComputedStyle(node).opacity) > 0.9)
        .map((node) => node.dataset.node),
      returnDash: parseFloat(getComputedStyle(element.querySelector('[data-figure-part="return-edge"]')!).strokeDashoffset),
      indicatorExtent: element.querySelector('[data-figure-part="unit"]')!.getBoundingClientRect().width,
    }));
    console.log(`reduced rest ${entry.id}: ${JSON.stringify(rest)} failures=${JSON.stringify(result.failures)}`);
    expect(result.pass, result.failures.map((failure) => failure.reason).join("; ")).toBe(true);
    expect(Number(rest.phase)).toBe(1);
    expect(rest.occupied).toEqual(["stage"]);
    expect(rest.returnDash).toBe(0);
    expect(rest.indicatorExtent).toBe(0);
  }
});

// The role palette bound both ways (spec validation 6), read off the rendered tree: every
// declared color role colors a prose span and a part inside a figure. The declaration module is
// staged beside this spec, so the expectation is external to the page.
// Mutation: drop the context spans from App.svelte and the context role is bound in the figures
// only — red (instrument.ts, "role bound in the prose").
test("figures: every color role is bound to both a prose span and a figure part", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const bound = await page.evaluate(() => {
    const read = (selector: string): string[] =>
      [...document.querySelectorAll(selector)]
        .map((node) => node.getAttribute("data-role") ?? "")
        .filter((role) => role.length > 0);
    return {
      prose: read(".page .section p .term[data-role], .page .section li .term[data-role]"),
      figures: read("figure [data-role], [data-hero-id] [data-role]"),
    };
  });
  const roles = Object.keys(grammar.colors);
  console.log(`role binding: prose=${JSON.stringify([...new Set(bound.prose)])} figures=${JSON.stringify([...new Set(bound.figures)])}`);
  for (const role of roles) {
    expect(bound.prose, `role ${role} colors no prose span`).toContain(role);
    expect(bound.figures, `role ${role} colors no figure part`).toContain(role);
  }
});
