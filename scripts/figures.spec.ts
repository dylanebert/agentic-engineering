import { createServer, type Server } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { perceptualDelta } from "./png";
import { figures } from "./manifest";
import { assertVaries } from "./variance";
import { assertReducedMotion } from "./reduced";
import { grammar } from "./vocabulary";

// Figure gate for the neutral article template. The sequence-shell arms retired with the
// WebGPU hero in S1, together with the real-tree vocabulary arm whose subject went with it
// (the role binding is the vocabulary oracle's owned red until S4). What remains: the
// substrate arm, the server contract, typography, readable measure, emphasis, rhythm, and
// non-interference.

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

test("substrate: package and dist contain no Shallot or typegpu", async () => {
  const packageText = await readFile(join(root, "package.json"), "utf8");
  expect(packageText.toLowerCase()).not.toContain("shallot");
  expect(packageText.toLowerCase()).not.toContain("typegpu");
  const readTree = async (path: string): Promise<string[]> => {
    const entries = await readdir(path, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory()
      ? readTree(join(path, entry.name))
      : readFile(join(path, entry.name), "utf8").catch(() => "")))).flat();
  };
  const built = (await readTree(dist)).join("\n").toLowerCase();
  expect(built).not.toContain("shallot");
  expect(built).not.toContain("typegpu");
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

// --- H1 overture register ---

test("overture: exactly one unlabeled overture sits above the opening", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const read = await page.evaluate(() => {
    const overtures = [...document.querySelectorAll("[data-overture-id]")];
    const opening = document.querySelector("section.section");
    return {
      count: overtures.length,
      states: overtures[0] ? [...overtures[0].querySelectorAll("[data-overture-state]")].map((node) => node.getAttribute("data-overture-state")) : [],
      labels: overtures[0]?.querySelectorAll("[data-figure-label], figcaption").length ?? -1,
      above: overtures[0] && opening ? (overtures[0].compareDocumentPosition(opening) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 : false,
      roles: overtures[0] ? [...overtures[0].querySelectorAll("[data-overture-state]")].map((node) => node.getAttribute("data-role")) : [],
    };
  });
  console.log(`overture register: ${JSON.stringify(read)}`);
  expect(read).toEqual({ count: 1, states: ["human", "agentic", "vibe"], labels: 0, above: true, roles: ["prose", "agentic", "vibe"] });
});

test("overture: reduced motion rests on a stable agentic captured-cell state", async ({ page }) => {
  const result = await assertReducedMotion(page, '[data-overture-id="spectrum-overture"]', async (target, step) => {
    if (step === 0) await target.goto(url, { waitUntil: "networkidle" });
  }, 1);
  const read = await page.locator('[data-overture-id="spectrum-overture"]').evaluate((element) => ({
    phase: getComputedStyle(element).getPropertyValue("--phase").trim(),
    cells: element.querySelector("pre")?.textContent?.split("\n") ?? [],
    width: element.querySelector("pre")?.getBoundingClientRect().width ?? 0,
  }));
  console.log(`overture reduced rest: phase=${read.phase} cells=${read.cells[0]?.length}x${read.cells.length} width=${read.width}`);
  expect(result.pass, result.failures.map((failure) => failure.reason).join("; ")).toBe(true);
  expect(Number(read.phase)).toBe(1);
  expect(read.cells).toHaveLength(14);
  expect(read.cells.every((row) => row.length === 22)).toBe(true);
  expect(read.width).toBeGreaterThanOrEqual(176);
});

test("overture: captured pose varies perceptibly across phase", async ({ page }) => {
  const steps = 3;
  const result = await assertVaries(page, '[data-overture-id="spectrum-overture"]', async (target, step) => {
    if (step === 0) await target.goto(url, { waitUntil: "networkidle" });
    await target.locator('[data-overture-id="spectrum-overture"]').evaluate((element, value) => {
      (element as HTMLElement).style.setProperty("--phase", value);
    }, String(step / (steps - 1)));
  }, steps);
  console.log(`overture variance: failures=${JSON.stringify(result.failures)}`);
  expect(result.pass, result.failures.map((failure) => failure.reason).join("; ")).toBe(true);
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
// orders come from the prose, not from the components: the spectrum runs vibe coding → agentic
// engineering → human code, and the loop runs spec → stage → verify with a return edge spanning
// back from the last node to the middle one: the spec is written once, so only stage and verify
// are inside the repeat.
// Mutation: swap the agentic and vibe entries' x coordinates in SpectrumAxis.svelte and the
// left-to-right label order reads agentic engineering, vibe coding, human code — red.
const ORDERS: Record<string, readonly string[]> = {
  "spectrum-axis": ["vibe coding", "agentic engineering", "human code"],
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

// Content assertion for what is named: a figure may only use the words its own section's prose
// uses, so a label cannot assert a term the reader has not been given. The comparison is
// case-insensitive because the page's display register is lowercase while its prose sentences
// are not ("Verify that stage" carries the loop's verify node).
// Mutation: rename the verify concept's label to "validate" and the loop's label is absent from
// the section's prose — red.
test("figures: every figure label is a substring of its section's prose", async ({ page }) => {
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
    console.log(`labels ${read.id}: ${JSON.stringify(read.labels)}`);
    expect(read.labels.length).toBeGreaterThan(0);
    for (const label of read.labels) {
      expect(label.length).toBeGreaterThan(0);
      expect(read.prose, `label "${label}" is not in ${read.id}'s section prose`).toContain(label);
    }
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

// Perceptual variance over a JND for what moves (taste.md: one assertion per claim kind). The
// three recorded failures this catches are inert variants that passed every other oracle, so the
// read is over rendered pixels, not over the CSS that produced them.
// Mutation: pin the spectrum halo and underline opacity at 1 and adjacent cycle states are
// perceptually identical — red (instrument.ts, "spectrum emphasis motion").
test("figures: the spectrum's middle position varies perceptibly across its cycle", async ({ page }) => {
  const steps = 3;
  const result = await assertVaries(page, figureSelector("spectrum-axis"), phaseDriver("spectrum-axis", steps), steps);
  console.log(`spectrum variance: steps=${result.steps} failures=${JSON.stringify(result.failures)}`);
  expect(result.pass, result.failures.map((failure) => failure.reason).join("; ")).toBe(true);
});

// Mutation: pin the loop's stage fills at full opacity and the cycle no longer advances — red
// (instrument.ts, "loop advance motion").
test("figures: the loop's advance varies perceptibly across its cycle", async ({ page }) => {
  const steps = 5;
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
    const phase = await page.locator(selector).evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--phase").trim(),
    );
    console.log(`reduced rest ${entry.id}: phase=${phase} failures=${JSON.stringify(result.failures)}`);
    expect(result.pass, result.failures.map((failure) => failure.reason).join("; ")).toBe(true);
    expect(Number(phase)).toBe(1);
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
      figures: read("figure [data-role]"),
    };
  });
  const roles = Object.keys(grammar.colors);
  console.log(`role binding: prose=${JSON.stringify([...new Set(bound.prose)])} figures=${JSON.stringify([...new Set(bound.figures)])}`);
  for (const role of roles) {
    expect(bound.prose, `role ${role} colors no prose span`).toContain(role);
    expect(bound.figures, `role ${role} colors no figure part`).toContain(role);
  }
});
