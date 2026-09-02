import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { beats, figures, sectionOrder } from "../src/lib/figures";

// Structural half of the figure-manifest arm (spec validation 2). The rendered half lives in
// scripts/oracle-text.spec.ts, which needs a browser to read the built page; these three
// properties are decidable from the source and the manuscript alone:
//
//   1. the page declares its sections in the manuscript's beat order,
//   2. every beat's anchor is a verbatim line of the manuscript, in the manuscript's order,
//   3. the manifest holds exactly the two declared figures, each sited in a real section.
//
// The manuscript sits outside this repo when it is checked out standalone, so property 2 skips
// with a note rather than reddening there.

const repo = join(import.meta.dir, "..");
const manuscript = join(repo, "../../manuscripts/agentic-engineering/script.txt");

function sectionIds(): string[] {
  const app = readFileSync(join(repo, "src/App.svelte"), "utf8");
  return [...app.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
}

describe("figure manifest", () => {
  test("the page's section order is the manuscript's beat order", () => {
    expect(sectionIds()).toEqual([...sectionOrder]);
  });

  test("section ids are unique", () => {
    const ids = sectionIds();
    expect(new Set(ids).size).toBe(ids.length);
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

  test("exactly the two declared figures, each sited in a real section", () => {
    expect(figures.length).toBe(2);
    expect(figures.map((f) => f.kind).sort()).toEqual(["axis", "loop"]);
    expect(new Set(figures.map((f) => f.id)).size).toBe(figures.length);
    for (const figure of figures) {
      expect(sectionIds()).toContain(figure.section);
      expect(figure.paragraph).toBeGreaterThanOrEqual(0);
      expect(figure.claim.trim().length).toBeGreaterThan(0);
    }
  });
});
