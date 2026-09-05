import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect as assertion, type Page, type Browser, type APIRequestContext, type TestInfo } from "@playwright/test";
import { perceptualDelta, type DecodedPng } from "./png";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion, settleToRest } from "./reduced";
import { classifyRegion } from "./region";

export type Arm = { title: string; run: (fixtures: {page: Page; browser: Browser; request: APIRequestContext}, info: TestInfo) => unknown; pure: boolean };
export type ArmInput = { root: string; dist: string; url: string; figures: typeof import("./manifest").figures; grammar: typeof import("./vocabulary").grammar };
function collector() {
  const arms: Arm[] = [];
  const test = Object.assign((title: string, run: Arm["run"]) => { arms.push({ title, run, pure: run.length === 0 }); }, {
    skip: (condition: boolean) => { if (condition) throw new Error("unselected GPU arm reached"); },
  });
  return { arms, test };
}

/** Retained figures.spec.ts assertions, shared by normal cases and named-red witnesses. */
export function figureArms(input: ArmInput): Arm[] {
  const { dist, url, figures, grammar } = input;
  const { arms, test } = collector();


test("substrate: dist contains no Shallot or typegpu", async () => {
  const readTree = async (path: string): Promise<string[]> => {
    const entries = await readdir(path, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory()
      ? readTree(join(path, entry.name))
      : readFile(join(path, entry.name), "utf8").catch(() => "")))).flat();
  };
  const built = (await readTree(dist)).join("\n").toLowerCase();
  assertion(built, "predicate:figure-1.1").not.toMatch(/(?:from|import\()\s*["\'](?:@dylanebert\/shallot|typegpu|unplugin-typegpu)/);
  assertion(built, "predicate:figure-1.2").not.toMatch(/<iframe|https?:\/\/(?:localhost|127\.0\.0\.1):\d+|\bvite\s+(?:dev|serve|preview)\b/);
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
  assertion(response.status(), "predicate:figure-2.1").toBe(404);
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
  assertion(reads.headingSize, "predicate:figure-3.1").toBeGreaterThanOrEqual(reads.bodySize);
  assertion(reads.titleSize, "predicate:figure-3.2").toBeGreaterThan(reads.headingSize);
  assertion(reads.bodyWeight, "predicate:figure-3.3").toBe("400");
  assertion(reads.headingWeight, "predicate:figure-3.4").toBe("600");
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
  assertion(reads.maximumNonFinalLine, "predicate:figure-4.1").toBeGreaterThanOrEqual(60);
  assertion(reads.maximumNonFinalLine, "predicate:figure-4.2").toBeLessThanOrEqual(75);

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
  assertion(mobile.width, "predicate:figure-4.3").toBe(mobile.viewport);
  assertion(mobile.paddingLeft, "predicate:figure-4.4").toBe(20);
  assertion(mobile.paddingRight, "predicate:figure-4.5").toBe(20);
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
  assertion(sweep.current, "predicate:figure-5.1").toBe(548);
  assertion(sweep.selected, "predicate:figure-5.2").toBeLessThanOrEqual(75);
  assertion(sweep.selected, "predicate:figure-5.3").toBeGreaterThanOrEqual(72);
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
  assertion(styles.emphasisWeight, "predicate:figure-6.1").toBe("600");
  assertion(styles.emphasisColor, "predicate:figure-6.2").not.toBe(styles.paragraphColor);

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
  assertion(emphasisDelta.meanDelta, "predicate:figure-6.3").toBeGreaterThan(3);

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
  for (const gap of rhythm.gaps) assertion(gap, "predicate:figure-6.4").toBeGreaterThan(rhythm.paragraphGap * 2.5);
});

// The neutral-template repair must not alter the story or placeholder geometry.
test("non-interference: story text remains intact", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await page.evaluate(() => ({
    text: (document.querySelector(".page") as HTMLElement).innerText,
  }));
  assertion(result.text, "predicate:figure-7.1").toContain("Agentic engineering is directing agents to make software.");
  assertion(result.text, "predicate:figure-7.2").toContain("Verifiability is how well those questions can be answered");
  assertion(result.text, "predicate:figure-7.3").toContain("The application of these principles is agentic engineering.");
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
  assertion(read, "predicate:figure-8.1").toEqual({ count: 1, states: ["human", "agentic", "vibe"], labels: 0, canvases: 1, above: true });
});

test("hero: reduced motion rests on the captured agentic frame", async ({ page }) => {
  const result = await assertReducedMotion(page, '[data-hero-id="spectrum-hero"]', async (target, step) => { if (step === 0) await target.goto(url, { waitUntil: "networkidle" }); }, 1);
  const read = await page.locator('[data-hero-id="spectrum-hero"]').evaluate((element) => ({ phase: getComputedStyle(element).getPropertyValue("--phase").trim(), rows: element.querySelector("pre")?.textContent?.split("\n").length, state: element.getAttribute("data-hero-state") }));
  console.log(`hero reduced rest: ${JSON.stringify(read)}`); assertion(result.pass, "predicate:figure-9.1").toBe(true); assertion(read, "predicate:figure-9.2").toEqual({ phase: "1", rows: 14, state: "agentic" });
});

test("hero: DOM spectrum uses strokes without area tint", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const fills = await page.locator('[data-hero-id] path, [data-hero-id] rect').evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fill));
  assertion(fills.every((fill) => fill === "none"), "predicate:figure-10.1").toBe(true);
});

// The plain-degradation boundary remains until its real-caller qualification.
// Sustained GPU regions, change, identity, lifetime and errors live in runtime.
test("hero: plain Chromium keeps silent rest", async ({ page }) => {
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
  await assertion(hero.locator("pre"), "predicate:figure-11.7").toBeVisible();
  await assertion(hero, "predicate:figure-11.8").not.toHaveAttribute("data-hero-gpu", "drawn");
  await page.waitForTimeout(700);
  assertion(await page.locator("body").innerText(), "predicate:figure-11.9").toBe(initialText);
  assertion(await page.evaluate(() => (window as any).__webgpuCalls), "predicate:figure-11.10").toBe(0);
  assertion(errors, "predicate:figure-11.11").toEqual([]);
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
  assertion(reads.total, "predicate:figure-13.1").toBe(figures.length);
  assertion(reads.sited, "predicate:figure-13.2").toEqual(figures.map((entry) => ({ id: entry.id, section: entry.section, paragraph: entry.paragraph })));
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
    assertion(leadIn, "predicate:figure-14.1 " + (`no figure mounted for manifest entry ${entry.id}`)).toBeDefined();
    assertion(leadIn!.tag, "predicate:figure-14.2").toBe("P");
    assertion(leadIn!.text, "predicate:figure-14.3").toContain(entry.claim);
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
  assertion(register.figcaptions, "predicate:figure-15.1").toBe(0);
  assertion(register.firstFollowsOpening, "predicate:figure-15.2").toBe(true);
  assertion(register.orphans, "predicate:figure-15.3").toBe(0);
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
    assertion(read, "predicate:figure-16.1 " + (`no rendered figure for ${entry.id}`)).toBeDefined();
    assertion(read.labels, "predicate:figure-16.2").toEqual([...ORDERS[entry.id]]);
  }
  // The loop's return edge runs back from the last node to the middle one, so it spans them both
  // and stops short of the first: the spec is not inside the repeat.
  const loop = geometry["stage-loop"];
  console.log(`return edge span: ${JSON.stringify(loop.span)} nodes=${JSON.stringify(loop.nodes)}`);
  assertion(loop.span, "predicate:figure-16.3").not.toBeNull();
  assertion(loop.span!.left, "predicate:figure-16.4").toBeGreaterThan(loop.nodes[0].right);
  assertion(loop.span!.right, "predicate:figure-16.5").toBeGreaterThanOrEqual((loop.nodes[2].left + loop.nodes[2].right) / 2);
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
  assertion(read, "predicate:figure-17.1 " + ("no rendered stage-loop return edge")).not.toBeNull();
  const stage = read!.nodes.find((node) => node.label === "stage");
  assertion(stage, "predicate:figure-17.2 " + ("no stage node in the loop figure")).toBeDefined();
  assertion(read!.end.x, "predicate:figure-17.3").toBeGreaterThanOrEqual(stage!.left);
  assertion(read!.end.x, "predicate:figure-17.4").toBeLessThanOrEqual(stage!.right);
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
    assertion(entry, "predicate:figure-18.1 " + (`no manifest entry for ${read.id}`)).toBeDefined();
    const claim = entry!.claim.toLowerCase();
    console.log(`claim labels ${read.id}: ${JSON.stringify(read.labels)} repeat=${claim.includes("repeat")}`);
    assertion(read.labels.length, "predicate:figure-18.2").toBeGreaterThan(0);
    for (const label of read.labels) {
      assertion(label.length, "predicate:figure-18.3").toBeGreaterThan(0);
      assertion(claim, "predicate:figure-18.4 " + (`label "${label}" is not in ${read.id}'s claim`)).toContain(label);
    }
    assertion(claim, "predicate:figure-18.5").toContain("repeat");
    assertion(read.prose, "predicate:figure-18.6").toContain(entry!.claim.toLowerCase());
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
  assertion(Math.max(...read.gaps), "predicate:figure-19.1").toBeLessThanOrEqual(0.5);
  assertion(read.visibility.flat().every(({ opacity, width }) => opacity > 0 && width > 0), "predicate:figure-19.2").toBe(true);
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
  assertion(Math.max(...distances) - Math.min(...distances), "predicate:figure-20.1").toBeGreaterThan(0.5);
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
  assertion(reads.every((read) => read.fills.every((fill) => fill === "none")), "predicate:figure-21.1").toBe(true);
  assertion(reads.map((read) => read.emphasis.find((node) => node.opacity > 0.9)?.node), "predicate:figure-21.2").toEqual(["spec", "stage", "verify", "stage"]);
  for (const read of reads.slice(0, 3)) {
    const landed = read.emphasis.find((node) => node.opacity > 0.9)!;
    assertion(Math.hypot(read.unit.x - landed.center.x, read.unit.y - landed.center.y), "predicate:figure-21.3").toBeLessThanOrEqual(0.5);
  }
  assertion(reads[0].unit.x, "predicate:figure-21.4").toBeLessThan(reads[1].unit.x);
  assertion(reads[1].unit.x, "predicate:figure-21.5").toBeLessThan(reads[2].unit.x);
  assertion(reads[3].unit.x, "predicate:figure-21.6").toBeLessThan(reads[2].unit.x);
  assertion(reads[3].unit.y, "predicate:figure-21.7").toBeGreaterThan(reads[2].unit.y);
  assertion(reads.slice(0, 3).every((read) => read.dash === 100), "predicate:figure-21.8").toBe(true);
  assertion(reads[3].dash, "predicate:figure-21.9").toBe(0);

  const steps = 4;
  const result = await assertVaries(page, figureSelector("stage-loop"), phaseDriver("stage-loop", steps), steps);
  console.log(`loop variance: steps=${result.steps} failures=${JSON.stringify(result.failures)}`);
  assertion(result.pass, "predicate:figure-21.10 " + (result.failures.map((failure) => failure.reason).join("; "))).toBe(true);
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
    assertion(result.pass, "predicate:figure-22.1 " + (result.failures.map((failure) => failure.reason).join("; "))).toBe(true);
    assertion(Number(rest.phase), "predicate:figure-22.2").toBe(1);
    assertion(rest.occupied, "predicate:figure-22.3").toEqual(["stage"]);
    assertion(rest.returnDash, "predicate:figure-22.4").toBe(0);
    assertion(rest.indicatorExtent, "predicate:figure-22.5").toBe(0);
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
    assertion(bound.prose, "predicate:figure-23.1 " + (`role ${role} colors no prose span`)).toContain(role);
    assertion(bound.figures, "predicate:figure-23.2 " + (`role ${role} colors no figure part`)).toContain(role);
  }
});

  return arms;
}

/** Retained capture.spec.ts assertions, shared by normal cases and named-red witnesses. */
export function captureArms(input: ArmInput): Arm[] {
  const { root, url } = input;
  const { arms, test } = collector();


test("server: capture missing assets return 404, not an index.html fallback", async ({ request }) => {
  const response = await request.get(`${url}missing-asset.probe`);
  console.log(`capture missing-asset probe: status=${response.status()}`);
  assertion(response.status(), "predicate:capture-1.1").toBe(404);
});

const views = [
  { name: "desktop.png", width: 1440, height: 900 },
  { name: "mobile.png", width: 390, height: 844 },
];
const goldenBrowser = "chromium";
const goldenPlatform = "darwin";

for (const view of views) {
  test(`capture ${view.name} (${view.width}x${view.height})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    // A full-page screenshot captures beyond the viewport without scrolling, so `loading="lazy"`
    // images below the fold are never requested. Scroll the page to trigger them, then wait for
    // every image to finish decoding before shooting.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      window.scrollTo(0, 0);
    });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((img) => img.decode().catch(() => undefined)),
      ),
    );

    // Oracle 7: no horizontal overflow at either viewport.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollWidth > view.width) {
      throw new Error(
        `horizontal overflow at ${view.width}x${view.height}: scrollWidth=${scrollWidth} > ${view.width}`,
      );
    }

    // H5 round 1: keep the full-width canvas footprint compact enough that the cube and
    // spectrum read as one overture rather than two marks separated by dead space.
    const canvasHeight = await page.locator(".canvas-wrap").evaluate((node) =>
      node.getBoundingClientRect().height,
    );
    assertion(canvasHeight, "predicate:capture-2.1").toBe(220);

    await page.evaluate(() => document.fonts.ready);
    // Always write the portable capture first, then compare only on the stamped seat. A WSL
    // capture runs on Windows and has no Darwin golden by design.
    await page.screenshot({ path: join(root, view.name), fullPage: true });
    const seat = `${testInfo.project.name}-${process.platform}`;
    if (seat === `${goldenBrowser}-${goldenPlatform}`) {
      // Playwright appends the project and platform to the snapshot filename.
      await assertion(page, "predicate:capture-2.2").toHaveScreenshot(
        view.name === "desktop.png" ? "neutral-desktop.png" : "neutral-mobile.png",
        { fullPage: true, mask: [page.locator("[data-hero-canvas]")] },
      );
    } else {
      console.log(`golden: skipped on ${seat}; stamped seat is ${goldenBrowser}-${goldenPlatform}`);
    }

    console.log(`captured ${view.name}`);
  });
}

  return arms;
}

/** Retained oracle-text.spec.ts assertions, shared by normal cases and named-red witnesses. */
export function textArms(input: ArmInput): Arm[] {
  const { root, url } = input;
  const { arms, test } = collector();


test("server: text oracle missing assets return 404, not an index.html fallback", async ({ request }) => {
  const response = await request.get(`${url}missing-asset.probe`);
  console.log(`text-oracle missing-asset probe: status=${response.status()}`);
  assertion(response.status(), "predicate:text-1.1").toBe(404);
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
      assertion(hasVibe, "predicate:text-2.1").toBe(true);
      assertion(hasWin98, "predicate:text-2.2").toBe(false);
    } else if (p > 0.75) {
      assertion(hasVibe, "predicate:text-2.3").toBe(false);
      assertion(hasWin98, "predicate:text-2.4").toBe(true);
    } else {
      assertion(hasVibe, "predicate:text-2.5").toBe(false);
      assertion(hasWin98, "predicate:text-2.6").toBe(false);
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

    assertion(banHits, "predicate:text-2.7").toEqual([]);
    assertion(emdashCount, "predicate:text-2.8").toBeLessThanOrEqual(1);
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
  assertion(sections, "predicate:text-3.1").toEqual(manifest.sectionOrder);

  for (const figure of manifest.figures) {
    const paragraphs = await page.evaluate((id) => {
      const section = document.getElementById(id);
      if (section === null) return null;
      return [...section.querySelectorAll(":scope > p")].map((p) => (p as HTMLElement).innerText);
    }, figure.section);
    assertion(paragraphs, "predicate:text-3.2 " + (`section #${figure.section} is missing`)).not.toBeNull();
    const list = paragraphs as string[];
    assertion(list.length, "predicate:text-3.3 " + (`#${figure.section} has ${list.length} paragraphs`)).toBeGreaterThan(
      figure.paragraph,
    );
    const paragraph = list[figure.paragraph].replace(/\s+/g, " ").trim();
    console.log(`manifest: ${figure.id} lead-in "${paragraph.slice(0, 60)}…"`);
    assertion(paragraph, "predicate:text-3.4 " + (`${figure.id}: claim not in its declared paragraph`)).toContain(figure.claim);
  }
});

  return arms;
}

/** Retained tripwires.spec.ts assertions, shared by normal cases and named-red witnesses. */
export function proseArms(input: ArmInput): Arm[] {
  const { url } = input;
  const { arms, test } = collector();


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

  assertion(over.map((c) => c.words), "predicate:prose-1.1").toEqual([]);
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

  assertion(rate, "predicate:prose-2.1").toBeLessThan(RELATIVIZER_MAX);
});

// Second-person density (spec Validation; criterion 3). Ceiling 16.5 per 1,000 words: the local
// technical sibling projects/verifiability measured 14.35 you-family hits per 1k and the tripwire
// is that reference figure plus 15% (14.35 × 1.15 = 16.50), the same derivation prose.md uses for
// the other two numbers. The shipped S6 page measured 29.08, which is the failure this arm exists
// to keep from coming back. Hits are printed with context so the count is read as classified
// direct address rather than as a bare grep: every hit on this page is second-person address, so
// none is discounted — the classification is reported, never subtracted.
const SECOND_PERSON_MAX = 16.5;
const SECOND_PERSON_RE = /\b(you|your|yours|yourself|yourselves)\b/gi;

test("tripwires: second-person density at or under 16.5 per 1,000 words", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const text = await page.evaluate(() => document.body.innerText ?? "");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const hits = [...text.matchAll(SECOND_PERSON_RE)].map((m) => ({
    word: m[0],
    context: text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, " "),
  }));
  const rate = words === 0 ? 0 : (hits.length / words) * 1000;

  console.log(
    `tripwires: ${hits.length} you-family hits in ${words} words = ${rate.toFixed(2)} per 1k (cap ${SECOND_PERSON_MAX}; reference projects/verifiability 14.35 per 1k, shipped S6 page 29.08)`,
  );
  for (const hit of hits) console.log(`  address: "${hit.word}" in "…${hit.context}…"`);

  assertion(rate, "predicate:prose-3.1").toBeLessThanOrEqual(SECOND_PERSON_MAX);
});

  return arms;
}

/** Retained instrument.spec.ts assertions, shared by normal cases and named-red witnesses. */
export let selfFixtures: Record<string, string> = {};
export function selfArms(input: ArmInput): Arm[] {
  const { url } = input;
  const { arms, test } = collector();


// Self-test for the figure instrument (variance + reduced-motion). Serves synthetic fixtures and
// drives them through the reusable harnesses. This proved the instrument discriminates before
// the real figures did, per oracle 5 / coding.md (a check is evidence only if you have seen it fail).
//
// Fixtures:
//   /hue            — a figure whose background hue rotates 90° per --step (the real shape).
//   /subperceptual  — a figure whose red channel steps by 1 RGB unit per --step: bytes differ,
//                     perception does not. Reds the perceptual floor (fix 2); would have passed
//                     the old Buffer.equals check.
//   /blank          — a figure that never draws (transparent). Reds the non-triviality guard
//                     (fix 4) even though it is perfectly stable.

// Pure region controls begin. These run in the existing instrument self-test staging path.
function regionField(
  field: [number, number, number],
  paint: (x: number, y: number) => number = () => 0,
): DecodedPng {
  const data = new Uint8Array(500 * 220 * 4);
  for (let y = 0; y < 220; y++) {
    for (let x = 0; x < 500; x++) {
      const delta = paint(x, y);
      const i = (y * 500 + x) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = field[c] > 127 ? field[c] - delta : field[c] + delta;
      data[i + 3] = 255;
    }
  }
  return { width: 500, height: 220, data };
}

const rectangle = (x: number, y: number, width: number, height: number, contrast = 80) =>
  (px: number, py: number) => px >= x && px < x + width && py >= y && py < y + height ? contrast : 0;
const black: [number, number, number] = [0, 0, 0];
const light: [number, number, number] = [251, 252, 253];
const regionControls = [
  { name: "blank light", image: regionField(light), pass: false },
  { name: "blank black", image: regionField(black), pass: false },
  { name: "500x1 row", image: regionField(light, rectangle(0, 110, 500, 1)), pass: false },
  { name: "1x220 column", image: regionField(black, rectangle(250, 0, 1, 220)), pass: false },
  { name: "4px specks", image: regionField(light, (x, y) =>
    (x === 200 || x === 299) && (y === 60 || y === 159) ? 80 : 0), pass: false },
  // Passing solid blocks explicitly demonstrates the limit: region size is not cube identity.
  { name: "bounded block on light", image: regionField(light, rectangle(200, 60, 100, 100)), pass: true },
  { name: "bounded block on black", image: regionField(black, rectangle(200, 60, 100, 100)), pass: true },
  { name: "glyph-sparse field", image: regionField(black, (x, y) => {
    if (x < 200 || x >= 296 || y < 60 || y >= 156) return 0;
    const gx = (x - 200) % 8;
    const gy = (y - 60) % 8;
    return gx < 3 && gy < 3 && (gx === 0 || gy === 0) ? 80 : 0;
  }), pass: true },
  { name: "soft-glow field", image: regionField(light, (x, y) =>
    Math.round(80 * Math.max(0, 1 - Math.hypot(x - 250, y - 110) / 50))), pass: true },
];

for (const control of regionControls) {
  test(`region: ${control.name}`, () => {
    const result = classifyRegion(control.image);
    console.log(`region control ${control.name}: ${JSON.stringify(result)}`);
    assertion(result.pass, "predicate:self-1.1").toEqual(control.pass);
    assertion(result.background, "predicate:self-1.2").toEqual(control.name.includes("black") ||
      control.name === "1x220 column" || control.name === "glyph-sparse field" ? black : light);
  });
}

// Independent, literal boundary witnesses; none read the classifier's constants.
const regionBoundaries = [
  { name: "12 levels excluded", paint: rectangle(200, 60, 100, 100, 12), failure: "pixels < 100", fails: true },
  { name: "13 levels included", paint: rectangle(200, 60, 100, 100, 13), failure: "pixels < 100", fails: false },
  { name: "99 pixels", paint: (x: number, y: number) =>
    x >= 200 && x < 299 && y === 60 + (x - 200) % 20 ? 80 : 0, failure: "pixels < 100", fails: true },
  { name: "100 pixels", paint: (x: number, y: number) =>
    x >= 200 && x < 300 && y === 60 + (x - 200) % 20 ? 80 : 0, failure: "pixels < 100", fails: false },
  { name: "19px width", paint: rectangle(200, 60, 19, 20), failure: "width < 20", fails: true },
  { name: "19px height", paint: rectangle(200, 60, 20, 19), failure: "height < 20", fails: true },
  { name: "20px dimensions", paint: rectangle(200, 60, 20, 20), failure: "width < 20", fails: false },
  { name: "19 occupied rows across 37px", paint: (x: number, y: number) =>
    rectangle(200, 60, 100, 37)(x, y) && y % 2 === 0 ? 80 : 0, failure: "occupied rows < 20", fails: true },
  { name: "19 occupied columns across 37px", paint: (x: number, y: number) =>
    rectangle(200, 60, 37, 100)(x, y) && x % 2 === 0 ? 80 : 0, failure: "occupied columns < 20", fails: true },
  { name: "4px left margin", paint: rectangle(4, 60, 100, 100), failure: "margin < 5", fails: true },
  { name: "4px top margin", paint: rectangle(200, 4, 100, 100), failure: "margin < 5", fails: true },
  { name: "4px right margin", paint: rectangle(396, 60, 100, 100), failure: "margin < 5", fails: true },
  { name: "4px bottom margin", paint: rectangle(200, 116, 100, 100), failure: "margin < 5", fails: true },
  { name: "5px margins", paint: rectangle(5, 5, 100, 100), failure: "margin < 5", fails: false },
  { name: "80% width", paint: rectangle(50, 60, 400, 100), failure: "width > 80%", fails: false },
  { name: "over 80% width", paint: rectangle(50, 60, 401, 100), failure: "width > 80%", fails: true },
  { name: "90% height", paint: rectangle(200, 11, 100, 198), failure: "height > 90%", fails: false },
  { name: "over 90% height", paint: rectangle(200, 10, 100, 199), failure: "height > 90%", fails: true },
  // The four-pixel perimeter has 5696 unique pixels; 56/5696 < 1%, 57/5696 > 1%.
  { name: "56 perimeter outliers", paint: rectangle(0, 0, 56, 1), failure: "perimeter outliers >= 1%", fails: false },
  { name: "57 perimeter outliers", paint: rectangle(0, 0, 57, 1), failure: "perimeter outliers >= 1%", fails: true },
];
for (const control of regionBoundaries) {
  test(`region boundary: ${control.name}`, () => {
    const result = classifyRegion(regionField(light, control.paint));
    console.log(`region boundary ${control.name}: ${JSON.stringify(result)}`);
    assertion(result.failures.includes(control.failure), "predicate:self-2.1").toEqual(control.fails);
    if (!control.fails && !control.name.includes("perimeter")) assertion(result.pass, "predicate:self-2.2").toEqual(true);
  });
}

test("region: perimeter median uses all four pixels, not the corner or outermost edge", () => {
  const image = regionField(light, rectangle(200, 60, 100, 100));
  for (let y = 0; y < 220; y++) {
    for (let x = 0; x < 500; x++) {
      if (x !== 0 && y !== 0 && x !== 499 && y !== 219) continue;
      image.data.set([0, 0, 0, 255], (y * 500 + x) * 4);
    }
  }
  const result = classifyRegion(image);
  assertion(result.background, "predicate:self-3.1").toEqual(light);
  assertion(result.perimeter.pixels, "predicate:self-3.2").toEqual(5696);
  assertion(result.perimeter.outliers, "predicate:self-3.3").toEqual(1436);
  assertion(result.pass, "predicate:self-3.4").toEqual(false);
});

test("region: exactly one percent perimeter outliers rejects", () => {
  const data = new Uint8Array(104 * 104 * 4);
  for (let x = 0; x < 16; x++) data[x * 4] = 80;
  const result = classifyRegion({ width: 104, height: 104, data });
  assertion(result.perimeter, "predicate:self-4.1").toEqual({ pixels: 1600, outliers: 16, fraction: 0.01 });
  assertion(result.failures.includes("perimeter outliers >= 1%"), "predicate:self-4.2").toEqual(true);
});

test("region: malformed dimensions or truncated RGBA throw rather than pass", () => {
  for (const image of [
    { width: 0, height: 0, data: new Uint8Array() },
    { width: NaN, height: 220, data: new Uint8Array() },
    { width: 1.5, height: 1, data: new Uint8Array(6) },
    { width: 500, height: 220, data: new Uint8Array(439999) },
  ]) {
    let rejected = false;
    try { classifyRegion(image); } catch { rejected = true; }
    assertion(rejected, "predicate:self-5.1").toEqual(true);
  }
});
// Pure region controls end.

const hueHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure {
        width: 200px;
        height: 200px;
        background: hsl(calc(var(--step, 0) * 90deg), 70%, 50%);
        transition: background 0.3s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .figure { transition: none; }
      }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

const subPerceptualHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure {
        width: 200px;
        height: 200px;
        /* 1-RGB-unit red step per --step: every state differs in bytes, none perceptibly. */
        background: rgb(calc(100 + var(--step, 0)), 100, 100);
      }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

const blankHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure { width: 200px; height: 200px; }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

// Mutation fixture for active-motion detection: infinite keyframes that do not honor
// prefers-reduced-motion. The animation metadata arm rejects it before the raster settle runs.
const restlessHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure {
        width: 200px;
        height: 200px;
        animation: drift 0.6s linear infinite;
      }
      @keyframes drift {
        from { background: hsl(0, 70%, 50%); }
        to { background: hsl(340, 70%, 50%); }
      }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

const finiteMotionHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure {
        width: 200px;
        height: 200px;
        background: hsl(calc(var(--step, 0) * 90deg), 70%, 50%);
        transition: background 120ms linear;
      }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

const rafRepaintHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure { width: 200px; height: 200px; }
    </style>
  </head>
  <body>
    <canvas class="figure" id="fig" width="200" height="200"></canvas>
    <script>
      const figure = document.querySelector("#fig");
      const context = figure.getContext("2d");
      let frame = 0;
      function repaint() {
        context.fillStyle = "white";
        context.fillRect(0, 0, 200, 200);
        context.fillStyle = "black";
        context.font = "32px sans-serif";
        context.fillText(String(frame++), 10, 50);
        requestAnimationFrame(repaint);
      }
      requestAnimationFrame(repaint);
    </script>
  </body>
</html>`;

selfFixtures = {
  "/hue": hueHtml,
  "/subperceptual": subPerceptualHtml,
  "/blank": blankHtml,
  "/restless": restlessHtml,
  "/finite-motion": finiteMotionHtml,
  "/raf-repaint": rafRepaintHtml,
};

// The axis driver: sets --step on the figure. To pin (mutation run), set the second arg to 0
// instead of step — every state renders the same hue, so the variance harness reds.
const driver: AxisDriver = async (page, step) => {
  await page.locator("#fig").evaluate((el, s) => el.style.setProperty("--step", String(s)), step);
};

async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r(null))),
      ),
  );
}

async function capture(page: Page, step: number): Promise<Buffer> {
  await driver(page, step);
  await settle(page);
  return page.locator("#fig").screenshot();
}

const STEPS = 4;

test("variance: figure varies across its axis", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  const result = await assertVaries(page, "#fig", driver, STEPS);
  assertion(result.failures, "predicate:self-6.1").toEqual([]);
  assertion(result.pass, "predicate:self-6.2").toBe(true);
});

test("reduced-motion: figure renders fully drawn at every state", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "#fig", driver, STEPS);
  assertion(result.failures, "predicate:self-7.1").toEqual([]);
  assertion(result.pass, "predicate:self-7.2").toBe(true);
});

test("settle: a zero frame-pair budget rejects instead of reporting rest", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  await assertion(settleToRest(page, "#fig", 0), "predicate:self-8.1").rejects.toThrow(/never reached rest within 0/);
});

test("settle: does not accept one equal stale pair before the driven frame arrives", async () => {
  const oldFrame = Buffer.from("old");
  const newFrame = Buffer.from("new");
  const frames = [oldFrame, oldFrame, newFrame, newFrame, newFrame];
  let captures = 0;
  const delayedPage = {
    evaluate: async () => undefined,
    locator: () => ({ screenshot: async () => frames[captures++] }),
  } as unknown as Page;

  await settleToRest(delayedPage, "#fig");
  assertion(captures, "predicate:self-9.1").toBe(5);
});

test("variance: sub-perceptual steps red at the perceptual floor (would pass byte-identity)", async ({ page }) => {
  await page.goto(url + "/subperceptual", { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const a = await capture(page, 0);
  const b = await capture(page, 1);
  // OLD check (byte-identity, Buffer.equals): bytes differ → would have PASSED (green).
  assertion(a.equals(b), "predicate:self-10.1").toBe(false);
  // NEW check (perceptual delta): 1-RGB-unit steps are sub-perceptual → REDS.
  const delta = perceptualDelta(a, b);
  console.log(
    `sub-perceptual old-vs-new: byte-identity=${a.equals(b)} (old would pass); ` +
      `perceptual meanDelta=${delta.meanDelta} maxDelta=${delta.maxDelta} extent=${delta.extent} (new reds)`,
  );
  assertion(delta.maxDelta, "predicate:self-10.2").toBeLessThan(3);
  assertion(delta.extent, "predicate:self-10.3").toBe(0);
  const result = await assertVaries(page, "#fig", driver, STEPS);
  assertion(result.pass, "predicate:self-10.4").toBe(false);
  assertion(result.failures.length, "predicate:self-10.5").toBeGreaterThan(0);
  assertion(result.failures[0].meanDelta, "predicate:self-10.6").toBe(delta.meanDelta);
  assertion(result.failures[0].extent, "predicate:self-10.7").toBe(delta.extent);
});

test("reduced-motion: blank element reds (never drew is not 'fully drawn')", async ({ page }) => {
  await page.goto(url + "/blank", { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "#fig", driver, 1);
  assertion(result.pass, "predicate:self-11.1").toBe(false);
  assertion(result.failures.some((f) => /trivial|blank/i.test(f.reason)), "predicate:self-11.2").toBe(true);
});

test("reduced-motion: permanently animating figure reds as active motion", async ({ page }) => {
  await page.goto(url + "/restless", { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "#fig", driver, STEPS);
  assertion(result.pass, "predicate:self-12.1").toBe(false);
  assertion(result.failures.length, "predicate:self-12.2").toBe(STEPS);
  for (const f of result.failures) assertion(f.reason, "predicate:self-12.3").toMatch(/active animation/);
});

test("reduced-motion: finite transition reds even though it would settle within the budget", async ({ page }) => {
  await page.goto(url + "/finite-motion", { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "#fig", driver, STEPS);
  assertion(result.pass, "predicate:self-13.1").toBe(false);
  assertion(result.failures.some((failure) => /active animation/.test(failure.reason)), "predicate:self-13.2").toBe(true);
});

test("reduced-motion: rAF repaint invisible to getAnimations reds on rest-budget expiry", async ({ page }) => {
  await page.goto(url + "/raf-repaint", { waitUntil: "networkidle" });
  const animationCount = await page
    .locator("#fig")
    .evaluate((el) => el.getAnimations({ subtree: true }).length);
  assertion(animationCount, "predicate:self-14.1").toBe(0);
  const result = await assertReducedMotion(page, "#fig", driver, 1);
  assertion(result.pass, "predicate:self-14.2").toBe(false);
  assertion(result.failures, "predicate:self-14.3").toHaveLength(1);
  assertion(result.failures[0].reason, "predicate:self-14.4").toMatch(/never reached rest within/);
});

test("guards: assertVaries throws for <2 steps", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  await assertion(assertVaries(page, "#fig", driver, 0), "predicate:self-15.1").rejects.toThrow();
  await assertion(assertVaries(page, "#fig", driver, 1), "predicate:self-15.2").rejects.toThrow();
});

test("guards: assertReducedMotion throws for <1 step", async ({ page }) => {
  await page.goto(url + "/hue", { waitUntil: "networkidle" });
  await assertion(assertReducedMotion(page, "#fig", driver, 0), "predicate:self-16.1").rejects.toThrow();
});

  return arms;
}
