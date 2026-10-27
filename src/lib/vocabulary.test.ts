import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { concepts, grammar, pageGround, type Concept } from "./vocabulary";


const repo = join(import.meta.dir, "../..");

type Role = { token: string; hex: string; concept: string };
type Grammar = {
  primitiveFamily: string;
  thickness: Record<string, string>;
  colors: Record<string, Role>;
  motion: Record<string, string>;
};

type Vocabulary = {
  grammar: Grammar;
  concepts: Record<string, Concept | Record<string, string>>;
  ground: string;
};

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function violations({ grammar, concepts, ground }: Vocabulary): string[] {
  const failures: string[] = [];
  const values = Object.values(concepts);

  if (new Set(values.map((concept) => concept.primitive)).size !== 1 ||
      values.some((concept) => concept.primitive !== grammar.primitiveFamily)) {
    failures.push("primitive family: exactly one declared family is shared by every concept");
  }
  if (Object.keys(grammar.thickness).length > 2 ||
      values.some((concept) => !(concept.thickness in grammar.thickness))) {
    failures.push("thickness: at most two declared roles and no concept-local role");
  }
  if (Object.keys(grammar.colors).length > 5) {
    failures.push("color roles: at most five declared color roles");
  }
  const unnamed = Object.entries(grammar.colors).filter(([, role]) => (role.concept ?? "").trim() === "");
  if (unnamed.length > 0) {
    failures.push(`color concepts: every declared role names its concept (${unnamed.map(([name]) => name).join(", ")})`);
  }
  const dim = Object.entries(grammar.colors).filter(([, role]) => contrast(role.hex, ground) < 4.5);
  if (dim.length > 0) {
    failures.push(`color contrast: every role clears 4.5:1 against the page ground (${dim
      .map(([name, role]) => `${name} ${contrast(role.hex, ground).toFixed(2)}`)
      .join(", ")})`);
  }
  if (values.some((concept) => !(concept.color in grammar.colors))) {
    failures.push("color: no concept-local color novelty");
  }
  if (Object.keys(grammar.motion).length > 2) failures.push("motion: at most two shared roles");
  if (values.some((concept) => !(concept.motion in grammar.motion))) {
    failures.push("motion: no concept-local motion novelty");
  }
  return failures;
}

type Binding = { prose: Set<string>; figures: Set<string> };

function bindingViolations({ prose, figures }: Binding): string[] {
  const missing = Object.keys(grammar.colors).filter((role) => !prose.has(role) || !figures.has(role));
  return missing.length === 0
    ? []
    : [`binding: every role appears in both a prose span and a figure part (missing ${missing.join(", ")})`];
}

const markup = (source: string): string => source.replace(/<style[\s\S]*?<\/style>/g, "");

function readBinding(): Binding {
  const spans = (source: string): Set<string> =>
    new Set(
      [...markup(source).matchAll(/<span class="term" data-role="([^"]+)"/g)].map((m) => m[1]),
    );
  const parts = (source: string): Set<string> => {
    const body = markup(source);
    const roles = new Set([...body.matchAll(/data-role="([^"{]+)"/g)].map((m) => m[1]));
    for (const match of body.matchAll(/concepts\.([a-zA-Z]+)/g)) {
      const concept = concepts[match[1] as keyof typeof concepts];
      if (concept) roles.add(concept.color);
    }
    return roles;
  };
  const prose = spans(readFileSync(join(repo, "src/App.svelte"), "utf8"));
  const lib = join(repo, "src/lib");
  const figures = new Set<string>();
  for (const file of readdirSync(lib)) {
    if (!file.endsWith(".svelte") || file === "Figure.svelte") continue;
    for (const role of parts(readFileSync(join(lib, file), "utf8"))) figures.add(role);
  }
  return { prose, figures };
}

test("concepts share the declared shapes, thickness, motion and named high-contrast colors", () => {
  expect(violations({ grammar, concepts, ground: pageGround })).toEqual([]);
});

test("every color role binds both prose and figure markup", () => {
  expect(bindingViolations(readBinding())).toEqual([]);
});
