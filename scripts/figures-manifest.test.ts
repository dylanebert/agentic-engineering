import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { beats, figures, overture, sectionOrder } from "../src/lib/figures";
import { grammar } from "../src/lib/vocabulary";

// Structural half of the figure-manifest arm (spec validation 2). The rendered half lives in
// scripts/oracle-text.spec.ts, which needs a browser to read the built page; these five
// properties are decidable from the source and the manuscript alone:
//
//   1. the page declares its sections in the manuscript's beat order,
//   2. every beat's anchor is a verbatim line of the manuscript, in the manuscript's order,
//   3. the manifest holds exactly the surviving loop figure, sited in a real section.
//
// The manuscript sits outside this repo when it is checked out standalone, so property 2 skips
// with a note rather than reddening there.

const repo = join(import.meta.dir, "..");
const manuscript = join(repo, "../../manuscripts/agentic-engineering/script.txt");

function sectionIds(): string[] {
  const app = readFileSync(join(repo, "src/App.svelte"), "utf8");
  return [...app.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
}

function appSource(): string {
  return readFileSync(join(repo, "src/App.svelte"), "utf8");
}

function sectionLevels(): Map<string, "section" | "subsection"> {
  const app = appSource();
  const levels = new Map<string, "section" | "subsection">();
  for (const match of app.matchAll(/<section\b[^>]*\bclass="([^"]+)"[^>]*\bid="([^"]+)"/g)) {
    levels.set(match[2], match[1].split(/\s+/).includes("principle") ? "subsection" : "section");
  }
  return levels;
}

describe("figure manifest", () => {
  test("the page's section order is the manuscript's beat order", () => {
    expect(sectionIds()).toEqual([...sectionOrder]);
  });

  test("section ids are unique", () => {
    const ids = sectionIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  // P1's hierarchy and spacing are one structural change: the spectrum has exactly three direct
  // paragraphs led by its role terms, no setup paragraph or point headings, and its paragraph gap
  // remains less than 1 / 2.5 of the declared section gap. Mutations: restore a point h3, prepend
  // the setup paragraph, move a term after prose, or raise the local margin to 21px — red.
  test("P1 keeps the repaired spectrum, principles, and verification structure", () => {
    const app = appSource();
    const spectrum = app.match(/<section class="section" id="spectrum">([\s\S]*?)<\/section>/)?.[1];
    expect(spectrum).toBeDefined();
    expect(spectrum?.match(/<h3\b/g) ?? []).toHaveLength(0);
    const paragraphs = [...(spectrum?.matchAll(/<p>\s*([\s\S]*?)<\/p>/g) ?? [])].map(
      (match) => match[1],
    );
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs.map((paragraph) => paragraph.match(/^<span class="term" data-role="([^"]+)">/)?.[1]))
      .toEqual(["vibe", "prose", "agentic"]);
    expect(app).toContain('<h2>principles of agentic engineering</h2>');
    expect(app).toContain('<h2>but how do you verify?</h2>');
    expect(app).not.toContain('class="point"');
    expect(app).not.toContain('href="/verifiability/"');

    const paragraphGap = Number(app.match(/#spectrum p \{\s*margin-top: ([\d.]+)px;/)?.[1]);
    const styles = readFileSync(join(repo, "src/app.css"), "utf8");
    const sectionGap = Number(styles.match(/--section-margin-top: ([\d.]+)px;/)?.[1]);
    expect(Number.isFinite(paragraphGap)).toBe(true);
    expect(Number.isFinite(sectionGap)).toBe(true);
    expect(sectionGap).toBeGreaterThan(2.5 * paragraphGap);
  });

  // P2 discloses the loop one concept at a time and reserves "stage" for the noun. The figure
  // follows the third paragraph, whose claim names every rendered label plus repeat. Its closing
  // heading also stands alone instead of being echoed by the first sentence. Mutations: move the
  // figure back to paragraph 1, restore "do the stage", or begin the closing "In practice" — red.
  test("P2 progressively discloses the loop and keeps the closing heading standalone", () => {
    const app = appSource();
    const loop = app.match(/<section class="section" id="loop">([\s\S]*?)<StageLoop \/>/)?.[1];
    expect(loop).toBeDefined();
    const paragraphs = [...(loop?.matchAll(/<p>\s*([\s\S]*?)<\/p>/g) ?? [])]
      .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toContain("spec");
    expect(paragraphs[0]).not.toContain("stage");
    expect(paragraphs[1]).toContain("stage");
    expect(paragraphs[1]).not.toContain("Verification");
    expect(paragraphs[2]).toContain(figures[0].claim);
    expect(figures[0].paragraph).toBe(2);
    expect(loop?.toLowerCase()).not.toMatch(/\b(?:do|doing|stage|staged|staging) the stage\b/);
    for (const label of ["spec", "stage", "verify", "repeat"]) {
      expect(figures[0].claim.toLowerCase()).toContain(label);
    }

    const closing = app.match(/<section class="section" id="closing">([\s\S]*?)<\/section>/)?.[1];
    const heading = closing?.match(/<h2>([^<]+)<\/h2>/)?.[1].trim().toLowerCase();
    const opener = closing?.match(/<p>\s*([\s\S]*?)<\/p>/)?.[1]
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    expect(heading).toBe("in practice");
    expect(opener).toBeDefined();
    expect(opener?.startsWith(heading!)).toBe(false);
  });

  test("every beat anchor is a verbatim manuscript line, in the manuscript's order", () => {
    if (!existsSync(manuscript)) {
      console.log(`figure manifest: ${manuscript} absent — skipping the manuscript arm`);
      return;
    }
    const lines = readFileSync(manuscript, "utf8").split("\n");
    const at = beats.map((beat) => {
      const index = lines.indexOf(beat.anchor);
      expect(index, `anchor not a verbatim manuscript line: "${beat.anchor}"`).toBeGreaterThan(-1);
      return index;
    });
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  test("exactly the surviving loop figure, sited in a real section", () => {
    expect(figures.length).toBe(1);
    expect(figures.map((f) => f.kind)).toEqual(["loop"]);
    expect(figures.map((f) => f.labels)).toEqual(["required"]);
    expect(new Set(figures.map((f) => f.id)).size).toBe(figures.length);
    for (const figure of figures) {
      expect(sectionIds()).toContain(figure.section);
      expect(figure.paragraph).toBeGreaterThanOrEqual(0);
      expect(figure.claim.trim().length).toBeGreaterThan(0);
    }
  });

  // Criterion 2 anchors a beat to a section *or subsection*: R1 grouped the two numbered principles
  // under one Principles section, so the level is part of the declaration and not an implementation
  // detail. Mutation: give #verifiability `class="section"` and its declared subsection level no
  // longer matches — red.
  test("each beat sits at the level the manifest declares", () => {
    const levels = sectionLevels();
    expect([...levels.keys()]).toEqual([...sectionOrder]);
    for (const beat of beats) {
      expect(levels.get(beat.section), `no section carries id ${beat.section}`).toBeDefined();
      expect(levels.get(beat.section), `${beat.section} level`).toBe(beat.level);
    }
  });

  // The overture's declaration half (criteria 5 and 8). H1 mounts it and replaces the source
  // substring read below with a rendered read; what is decidable now is the declaration: exactly
  // three states left to right, each on a declared role and keyed to a term the prose spends, no
  // labels, no claim, no beat, and a rest state on agentic.
  // Mutation: add a fourth state, or set `labels: "required"`, and this arm reds.
  test("the overture declares three unlabeled states, each named later in the prose", () => {
    expect(overture.kind).toBe("hero");
    expect(overture.labels).toBe("none");
    expect(overture.canvas).toBe("one");
    expect(overture.site).toBe("above-opening");
    expect(overture.rest).toBe("agentic");
    expect(overture.states.map((state) => state.state)).toEqual(["human", "agentic", "vibe"]);
    expect(beats.some((beat) => beat.section === overture.id)).toBe(false);
    expect(figures.some((figure) => figure.id === overture.id)).toBe(false);
    const roles = Object.keys(grammar.colors);
    const app = readFileSync(join(repo, "src/App.svelte"), "utf8");
    for (const state of overture.states) {
      expect(roles, `overture role ${state.role}`).toContain(state.role);
      expect(app, `overture term "${state.term}" is not in the prose`).toContain(state.term);
    }
  });
});
