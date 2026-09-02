import { createServer, type Server } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { perceptualDelta } from "./png";

// Figure gate for the neutral article template. The twelve arms retired in S1 belonged to
// the deleted spectrum or its undriven page-dress axis; the six arms below retain the
// server, typography, readable-measure, emphasis, rhythm, and non-interference contracts.

const root = __dirname;
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

// --- Sequence shell contracts ---

test("hero controls: real buttons advance and retreat", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const position = page.locator(".hero output");
  await expect(position).toHaveText("1 of 8");
  await page.getByRole("button", { name: "Next slide" }).click();
  await expect(position).toHaveText("2 of 8");
  await page.getByRole("button", { name: "Previous slide" }).click();
  await expect(position).toHaveText("1 of 8");
});

test("hero keyboard: arrow keys operate the focused sequence", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const hero = page.getByRole("button", { name: "Next slide" });
  await hero.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".hero output")).toHaveText("2 of 8");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".hero output")).toHaveText("1 of 8");
});

test("hero caption: current slide and caption remain bound", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Next slide" }).click();
  const caption = page.locator(".hero figcaption");
  await expect(caption).toHaveAttribute("data-caption-index", "1");
  await expect(caption).toHaveText("Placeholder caption for scene 1, slide 2, with enough placeholder copy to occupy a second line.");
  await expect(page.locator('.hero .slide.current')).toHaveAttribute("data-slide", "2");
});

test("hero reduced motion: every slide is fully disclosed at rest", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  const slides = page.locator(".hero .slide");
  await expect(slides).toHaveCount(8);
  for (let index = 0; index < 8; index += 1) await expect(slides.nth(index)).toBeVisible();
  const moving = await page.locator(".hero").evaluate((hero) =>
    hero.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length,
  );
  expect(moving).toBe(0);
});

test("hero layout: advancing does not shift the shell", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const hero = page.locator(".hero");
  const before = await hero.boundingBox();
  await page.getByRole("button", { name: "Next slide" }).click();
  const after = await hero.boundingBox();
  expect(after).toEqual(before);
});

test("hero substrate: package and dist contain no Shallot or typegpu", async () => {
  const packageText = await readFile(join(root, "package.json"), "utf8");
  expect(packageText.toLowerCase()).not.toContain("shallot");
  expect(packageText.toLowerCase()).not.toContain("typegpu");
  const assets = await readdir(join(dist, "assets"));
  const built = (await Promise.all(assets.map((asset) => readFile(join(dist, "assets", asset), "utf8").catch(() => "")))).join("\n").toLowerCase();
  expect(built).not.toContain("shallot");
  expect(built).not.toContain("typegpu");
});

// This arm reads the vocabulary emitted by the built Svelte tree, not the declaration module.
// Each mutation changes that real DOM tree and is rejected by the same reader as production.
test("hero vocabulary: real tree obeys the shared grammar and rejects novelty", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const results = await page.locator(".hero .stage").evaluate((stage) => {
    type Grammar = {
      primitiveFamily: string;
      thickness: Record<string, string>;
      colors: Record<string, { token: string; semantic: string }>;
      motion: Record<string, string>;
    };
    const read = (): string[] => {
      const grammar = JSON.parse((stage as HTMLElement).dataset.heroGrammar ?? "null") as Grammar | null;
      const concepts = [...stage.querySelectorAll<HTMLElement>("[data-concept]")];
      if (!grammar || concepts.length === 0) return ["population"];
      const failures: string[] = [];
      const primitives = new Set(concepts.map((node) => node.dataset.primitive));
      if (primitives.size !== 1 || !primitives.has(grammar.primitiveFamily)) failures.push("primitive");
      if (Object.keys(grammar.thickness).length > 2 || concepts.some((node) => !(node.dataset.thickness! in grammar.thickness))) failures.push("thickness");
      const accents = Object.values(grammar.colors).filter((color) => color.semantic !== "page-neutral");
      if (accents.length > 1 || accents.some((color) => color.semantic.trim() === "") || concepts.some((node) => !(node.dataset.color! in grammar.colors))) failures.push("color");
      if (Object.keys(grammar.motion).length > 2 || concepts.some((node) => !(node.dataset.motion! in grammar.motion))) failures.push("motion");
      if (concepts.some((node) => !node.dataset.label?.trim())) failures.push("label");
      return failures;
    };
    const originalGrammar = (stage as HTMLElement).dataset.heroGrammar!;
    const concept = (id: string) => stage.querySelector<HTMLElement>(`[data-concept="${id}"]`)!;
    const mutations: Array<[string, string, () => void]> = [
      ["mixed primitive family", "primitive", () => { concept("vibe").dataset.primitive = "circle"; }],
      ["concept-local shape", "primitive", () => { concept("agentic").dataset.primitive = "triangle"; }],
      ["concept-local color", "color", () => { concept("human").dataset.color = "human-blue"; }],
      ["concept-local motion", "motion", () => { concept("verify").dataset.motion = "verify-spin"; }],
      ["third thickness role", "thickness", () => { const g = JSON.parse(originalGrammar); g.thickness.detail = "2px"; (stage as HTMLElement).dataset.heroGrammar = JSON.stringify(g); }],
      ["second accent", "color", () => { const g = JSON.parse(originalGrammar); g.colors.warning = { token: "--warning", semantic: "warning" }; (stage as HTMLElement).dataset.heroGrammar = JSON.stringify(g); }],
      ["third motion role", "motion", () => { const g = JSON.parse(originalGrammar); g.motion.orbit = "orbit"; (stage as HTMLElement).dataset.heroGrammar = JSON.stringify(g); }],
    ];
    const baseline = read();
    const mutationReads = mutations.map(([name, expected, mutate]) => {
      (stage as HTMLElement).dataset.heroGrammar = originalGrammar;
      for (const node of stage.querySelectorAll<HTMLElement>("[data-concept]")) {
        node.dataset.primitive = "rounded-rectangle";
        node.dataset.color = "ink";
        node.dataset.motion = "reveal";
      }
      mutate();
      return { name, expected, failures: read() };
    });
    return { baseline, mutationReads };
  });
  expect(results.baseline).toEqual([]);
  for (const mutation of results.mutationReads) {
    console.log(`real-tree mutation rejected: ${mutation.name} -> ${mutation.failures.join(",")}`);
    expect(mutation.failures).toContain(mutation.expected);
  }
});

// --- Server contract: missing assets 404 (no SPA fallback masking) ---

// The figures server is the gate's only view of the built page; a fallback that serves
// index.html for a missing asset turns a broken script/stylesheet/font request into a 200
// carrying HTML. This arm pins the server's missing-asset 404 behavior — nothing broader:
// traversal handling is the equivalence server's own concern and is not claimed here.
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

test("typography: selected desktop measure is the widest passing local sweep", async ({ page }) => {
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
    const next = readMaximum(549);
    return {
      current: document.querySelector(".page")!.getBoundingClientRect().width,
      selected,
      next,
    };
  });
  console.log(`neutral measure selection: current=${sweep.current}px, 548px max=${sweep.selected}, 549px max=${sweep.next}`);
  expect(sweep.current).toBe(548);
  expect(sweep.selected).toBeLessThanOrEqual(75);
  expect(sweep.selected).toBeGreaterThanOrEqual(72);
  expect(sweep.next).toBeGreaterThan(75);
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
  expect(result.text).toContain("Agentic engineering is the practice of directing agents");
  expect(result.text).toContain("the hard part moved from writing the code to checking it.");
  expect(result.text).toContain("The three are priced by cost against reach.");
});
