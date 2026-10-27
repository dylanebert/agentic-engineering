import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { beats, figures, overture, sectionOrder } from "./figures";
import { grammar } from "./vocabulary";


const repo = join(import.meta.dir, "../..");

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
  test("the page's section order matches the declared beat order", () => {
    expect(sectionIds()).toEqual([...sectionOrder]);
  });

  test("section ids are unique", () => {
    const ids = sectionIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the spectrum discloses three roles with subordinate paragraph spacing", () => {
    const app = appSource();
    const spectrum = app.match(/<section class="section" id="spectrum">([\s\S]*?)<\/section>/)?.[1];
    expect(spectrum).toBeDefined();
    expect(spectrum?.match(/<h3\b/g) ?? []).toHaveLength(0);
    const paragraphs = [...(spectrum?.matchAll(/<p>\s*([\s\S]*?)<\/p>/g) ?? [])].map(
      (match) => match[1],
    );
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs.map((paragraph) => paragraph.match(/<span class="term" data-role="([^"]+)">/)?.[1]))
      .toEqual(["vibe", "prose", "agentic"]);
    expect(app).toContain('<h2>principles of agentic engineering</h2>');
    expect(app).toContain('<h2>how do you verify?</h2>');
    expect(app).not.toContain('class="point"');
    expect(app).not.toContain('href="/verifiability/"');

    const paragraphGap = Number(app.match(/#spectrum p \{\s*margin-top: ([\d.]+)px;/)?.[1]);
    const styles = readFileSync(join(repo, "src/app.css"), "utf8");
    const sectionGap = Number(styles.match(/--section-margin-top: ([\d.]+)px;/)?.[1]);
    expect(Number.isFinite(paragraphGap)).toBe(true);
    expect(Number.isFinite(sectionGap)).toBe(true);
    expect(sectionGap).toBeGreaterThan(2.5 * paragraphGap);
  });

  test("the loop discloses spec before implement and verify", () => {
    const app = appSource();
    const loop = app.match(/<section class="section" id="loop">([\s\S]*?)<StageLoop \/>/)?.[1];
    expect(loop).toBeDefined();
    const paragraphs = [...(loop?.matchAll(/<p>\s*([\s\S]*?)<\/p>/g) ?? [])]
      .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toContain("spec");
    expect(paragraphs[0]).not.toContain("verify");
    expect(paragraphs[1]).toContain("implement");
    expect(paragraphs[1]).toContain("verify");
    expect(paragraphs[1]).toContain(figures[0].claim);
    expect(figures[0].paragraph).toBe(1);
    expect(loop?.toLowerCase()).not.toMatch(/\b(?:do|doing|stage|staged|staging) the stage\b/);
    for (const label of ["spec", "implement", "verify", "repeat"]) {
      expect(figures[0].claim.toLowerCase()).toContain(label);
    }
    expect(app).not.toContain('id="closing"');
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

  test("each beat sits at the level the manifest declares", () => {
    const levels = sectionLevels();
    expect([...levels.keys()]).toEqual([...sectionOrder]);
    for (const beat of beats) {
      expect(levels.get(beat.section), `no section carries id ${beat.section}`).toBeDefined();
      expect(levels.get(beat.section), `${beat.section} level`).toBe(beat.level);
    }
  });

  test("the overture declares three unlabeled states, each named later in the prose", () => {
    expect(overture.kind).toBe("hero");
    expect(overture.labels).toBe("none");
    expect(overture.canvas).toBe("one");
    expect(overture.site).toBe("above-opening");
    expect(overture.rest).toBe("agentic");
    expect(overture.states.map((state) => state.state)).toEqual(["human", "agentic", "vibe"]);
    expect(overture.states.map((state) => state.treatment)).toEqual(["shallot", "cells", "glow"]);
    expect(beats.some((beat) => beat.section === overture.id)).toBe(false);
    expect(figures.some((figure) => figure.id === overture.id)).toBe(false);
    const roles = Object.keys(grammar.colors);
    const app = readFileSync(join(repo, "src/App.svelte"), "utf8");
    for (const state of overture.states) {
      expect(roles, `overture role ${state.role}`).toContain(state.role);
      expect(app.toLowerCase(), `overture term "${state.term}" is not in the prose`).toContain(state.term);
    }
  });
});
