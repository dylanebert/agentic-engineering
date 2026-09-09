import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, type Page } from "@playwright/test";
import { bytes, closeBrowser, launch, namedRed, serve } from "./campaign";
import { figureArms } from "./arms";
import { figures } from "./manifest";
import { grammar } from "./vocabulary";

const repo = resolve(import.meta.dir, "..");
const input = process.env.NOTE_INPUT;
const output = process.env.NOTE_OUTPUT;
if (!input || !output) throw new Error("NOTE_INPUT must name the runtime baseline input; NOTE_OUTPUT must name an owned new receipt directory");
mkdirSync(output, { recursive: false });
const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const source = JSON.parse(readFileSync(join(input, "../../source-before.json"), "utf8"));
for (const file of ["src/App.svelte", "src/lib/NoteExample.svelte", "public/note.html"]) {
  expect(sha(readFileSync(join(repo, file))), `predicate:composition.source ${file}`).toBe(source[file]);
}
const saved = readFileSync(join(repo, "examples/note-persistence/final/app/index.html"));
expect(readFileSync(join(input, "dist/note.html")), "predicate:composition.saved-copy").toEqual(saved);
writeFileSync(join(output, "inputs.json"), JSON.stringify({ input, source, built: bytes(input), saved: sha(saved) }, null, 2));
const server = await serve({ id: "note-composition", root: input, mode: "files", hashes: bytes(input) });
const handle = await launch({}, "plain");
const record = "https://raw.githubusercontent.com/dylanebert/agentic-engineering/df8bb95e59ce3116c259a8ccaef1b5a9eb4aed25/examples/note-persistence/";
let cases = 0;
async function structure(page: Page) {
  expect(await page.locator("iframe").count(), "predicate:composition.frame").toBe(1);
  expect(await page.locator("iframe").getAttribute("src"), "predicate:composition.frame-source").toBe("/agentic-engineering/note.html");
  expect(await page.locator("[data-note-record]").getAttribute("href"), "predicate:composition.detail-target").toBe(record + "detail.md");
  expect(await page.locator("[data-note-source=starter]").getAttribute("href"), "predicate:composition.starter-target").toBe(record + "starter/app/index.html");
  expect(await page.locator("[data-note-source=final]").getAttribute("href"), "predicate:composition.final-target").toBe(record + "final/app/index.html");
  expect(await page.locator("[data-note-direct]").getAttribute("href"), "predicate:composition.direct-target").toBe("/agentic-engineering/note.html");
  expect(await page.locator("[data-note-detail]").getAttribute("open"), "predicate:composition.closed").toBeNull();
  expect(await page.locator(".section > h2").allTextContents(), "predicate:composition.headings").toEqual(["the spectrum", "principles of agentic engineering", "the loop", "how do you verify?"]);
  const placement = await page.locator("#loop").evaluate(loop => {
    const diagram = loop.querySelector("[data-figure-id]")!;
    const ps = [...loop.querySelectorAll(":scope > p")];
    const frame = loop.querySelector("iframe")!;
    const precedes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { loopTop: loop.getBoundingClientRect().top + window.scrollY, concepts: ps.slice(0, 2).map(p => p.textContent!.replace(/\s+/g, " ").trim()), conceptsBefore: ps.slice(0, 2).every(p => precedes(p, diagram)), diagramBeforeFrame: precedes(diagram, frame), lead: ps[2]?.textContent?.replace(/\s+/g, " ").trim() };
  });
  expect(placement.concepts[0], "predicate:composition.starter").toContain("reloading loses the note");
  expect(placement.concepts[0], "predicate:composition.spec").toContain("spec");
  expect(placement.concepts[1], "predicate:composition.fresh").toContain("fresh conversation");
  expect(placement.conceptsBefore && placement.diagramBeforeFrame, "predicate:composition.order").toBe(true);
  expect(placement.lead, "predicate:composition.lead").toContain("Type a few lines");
  return placement;
}
async function reloadValue(page: Page, value: string) {
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.frameLocator("iframe").locator("textarea"), "predicate:composition.persistence").toHaveValue(value);
}
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await handle.browser.newContext({ viewport, reducedMotion: "reduce" });
    const errors: string[] = [];
    const page = await context.newPage();
    page.on("pageerror", error => { if (page.url().startsWith(server.url)) errors.push(error.message); });
    try {
      const arm = figureArms({ root: input, dist: join(input, "dist"), url: server.url, figures, grammar }).find(a => a.title === "note: sole frame serves the retained implementation")!;
      await arm.run({ page, browser: handle.browser, request: context.request }, undefined as never);
      const placement = await structure(page);
      const closedText = await page.locator(".page").innerText();
      expect(closedText, "predicate:composition.setup-visible").toContain("A setup agent supplied");
      expect(closedText, "predicate:composition.limits-visible").toContain("only in this browser at this address");
      expect(closedText, "predicate:composition.disclosure-hidden").not.toContain("This run followed a separate");
      writeFileSync(join(output, `closed-${viewport.width}.txt`), closedText);
      writeFileSync(join(output, `placement-${viewport.width}.json`), JSON.stringify(placement, null, 2));
      await page.screenshot({ path: join(output, `article-${viewport.width}.png`), fullPage: true });
      const text = page.frameLocator("iframe").locator("textarea");
      await text.fill("first line\nsecond line"); await reloadValue(page, "first line\nsecond line"); cases++;
      await text.fill("replacement\nkept on reload"); await reloadValue(page, "replacement\nkept on reload"); cases++;
      for (let n = 0; n < 2; n++) {
        await text.fill(`clear round ${n}`);
        await page.frameLocator("iframe").getByRole("button", { name: "Clear", exact: true }).click();
        await expect(text).toHaveValue(""); await reloadValue(page, ""); cases++;
      }
      await page.locator("summary").click();
      expect(await page.locator("[data-note-detail]").getAttribute("open"), "predicate:composition.open").not.toBeNull();
      const links = await page.locator("[data-note-detail] a").evaluateAll(nodes => nodes.map(n => (n as HTMLAnchorElement).href));
      expect(links.length, "predicate:composition.link-population").toBe(8);
      for (const href of links) {
        const response = await context.request.get(href);
        expect(response.status(), `predicate:composition.link-status ${href}`).toBe(200);
        expect(href.startsWith(record), "predicate:composition.source-origin").toBe(true);
        expect(await response.body(), `predicate:composition.source-bytes ${href}`).toEqual(readFileSync(join(repo, "examples/note-persistence", href.slice(record.length))));
      }
      // Follow source navigation in the actual browser, then return to the composed article.
      for (const selector of ["[data-note-source=starter]", "[data-note-source=final]", "[data-note-record]"]) {
        const href = await page.locator(selector).getAttribute("href");
        await page.locator(selector).click(); await page.waitForURL(href!);
        expect(page.url(), "predicate:composition.follow-source").toBe(href!);
        await page.goto(server.url, { waitUntil: "networkidle" }); await page.locator("summary").click();
      }
      await page.locator("summary").click();
      await page.locator("[data-note-direct]").click(); await page.waitForURL(server.url + "note.html");
      expect(sha(await (await context.request.get(page.url())).body()), "predicate:composition.direct-bytes").toBe(sha(saved));
      await expect(page.locator("textarea")).toHaveValue("");
      await page.goto(server.url, { waitUntil: "networkidle" });
      expect(errors, "predicate:composition.errors").toEqual([]);
      cases++;
      // Real composed DOM defects exercise these exact readers, not synthetic gate copies.
      await page.locator("iframe").evaluate(frame => frame.remove());
      await namedRed("composition.frame", () => structure(page));
      await page.reload({ waitUntil: "networkidle" });
      await page.locator("[data-note-record]").evaluate(link => link.setAttribute("href", "/agentic-engineering/missing-detail.md"));
      await namedRed("composition.detail-target", () => structure(page));
      await page.reload({ waitUntil: "networkidle" });
      const starter = readFileSync(join(repo, "examples/note-persistence/starter/app/index.html"));
      await page.route("**/note.html", route => route.fulfill({ contentType: "text/html", body: starter }));
      await page.reload({ waitUntil: "networkidle" });
      await page.frameLocator("iframe").locator("textarea").fill("must survive");
      await namedRed("composition.persistence", () => reloadValue(page, "must survive"));
      cases += 3;
      writeFileSync(join(output, `result-${viewport.width}.json`), JSON.stringify({ viewport, cases, errors, links }));
    } finally { await context.close(); }
  }
  expect(cases, "predicate:composition.case-count").toBe(16);
  if (process.argv.includes("--compare")) {
    console.log("=== CLOSED-DETAIL ARTICLE ===\n" + readFileSync(join(output, "closed-1440.txt"), "utf8"));
    console.log("=== PLACEMENT ===\n" + readFileSync(join(output, "placement-1440.json"), "utf8"));
    const captureRoot = "/Users/dylan.ebert/kex/reference/taste/captures";
    for (const file of ["taste-loops-latency-figure.txt", "adaptive-ml-rl-visualized.html", "adaptive-ml-speculative-decoding.html"]) {
      const excerpt = readFileSync(join(captureRoot, file), "utf8");
      expect(excerpt.length, "predicate:composition.reference-population").toBeGreaterThan(0);
      console.log(`=== MARKED REFERENCE ${file} sha256=${sha(excerpt)} ===\n${excerpt}`);
    }
    console.log("Comparison channels: concise prose, short exhibit lead-in, one live result, optional disclosure. Not a taste score or visual acceptance.");
  }
  console.log(JSON.stringify({ cases, failures: 0, output, input }));
} finally { await closeBrowser(handle); await server.close(); }
