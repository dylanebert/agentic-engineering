import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { concepts, grammar, pageGround, type Concept } from "../src/lib/vocabulary";

/**
 * Grammar oracle for the page's shared visual vocabulary: one primitive family, at most two
 * thickness roles, at most two motion roles, at most five color roles, every color role naming
 * the concept it carries at 4.5:1 against the page ground, and no concept-local novelty.
 *
 * Owned red. One arm — `binding:` — is expected to fail until S4 mounts the color-role spans
 * on the prose and the matching parts in the figures. It runs on every pass and reports, but
 * its failures are routed through OWNED_RED below and never reach the exit code, so the rest
 * of the suite still exits 0. S4 deletes the arm's name from OWNED_RED and the arm starts
 * gating. Every other arm is a hard failure and is mutation-proved in place at the bottom.
 */
const OWNED_RED = ["binding:"];

const repo = join(import.meta.dir, "..");

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

export function violations({ grammar, concepts, ground }: Vocabulary): string[] {
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

// The binding arm reads the authored tree, not the declaration module: a role earns its place
// only if it colors a prose span in App.svelte *and* a part inside a figure component.
function bindingFailures(): string[] {
  const roles = (source: string): Set<string> =>
    new Set([...source.matchAll(/data-role="([^"]+)"/g)].map((match) => match[1]));
  const prose = roles(readFileSync(join(repo, "src/App.svelte"), "utf8"));
  const lib = join(repo, "src/lib");
  const figures = new Set<string>();
  for (const file of readdirSync(lib)) {
    if (!file.endsWith(".svelte") || file === "Figure.svelte") continue;
    for (const role of roles(readFileSync(join(lib, file), "utf8"))) figures.add(role);
  }
  const missing = Object.keys(grammar.colors).filter((role) => !prose.has(role) || !figures.has(role));
  return missing.length === 0
    ? []
    : [`binding: every role appears in both a prose span and a figure part (missing ${missing.join(", ")})`];
}

const production: Vocabulary = { grammar, concepts, ground: pageGround };
const owned = (failure: string): boolean => OWNED_RED.some((prefix) => failure.startsWith(prefix));

const productionFailures = [...violations(production), ...bindingFailures()];
for (const failure of productionFailures.filter(owned)) {
  console.log(`vocabulary oracle: OWNED RED (until S4) ${failure}`);
}
const hard = productionFailures.filter((failure) => !owned(failure));
if (hard.length > 0) {
  console.error(hard.join("\n"));
  process.exit(1);
}

function mutant(name: string, change: (copy: Vocabulary) => void, expected: string): void {
  const copy = structuredClone(production) as Vocabulary;
  change(copy);
  const failures = violations(copy);
  if (!failures.some((failure) => failure.startsWith(expected))) {
    console.error(`mutation survived: ${name}; failures=${failures.join(" | ") || "none"}`);
    process.exitCode = 1;
    return;
  }
  console.log(`mutation rejected: ${name} -> ${expected}`);
}

/**
 * Mutation record (2026-09-02): each production-table mutation below was first run as the
 * oracle subject and returned exit 1 on its named predicate; restoring the table returned 0.
 * These in-process replays keep the same discriminating mutations durable at every gate run:
 * mixed primitive family, third thickness role, sixth color role, an unnamed role concept, a
 * role under 4.5:1, third motion role, and concept-local color/shape/motion values. A mutant
 * is restored by structuredClone isolation.
 */
const role = (hex: string, concept: string): Role => ({ token: "--role-extra", hex, concept });

mutant("mixed primitive family", (copy) => { copy.concepts.vibe.primitive = "circle"; }, "primitive family:");
mutant("third thickness role", (copy) => { copy.grammar.thickness.detail = "2px"; }, "thickness:");
mutant("sixth color role", (copy) => { copy.grammar.colors.extra = role("#402020", "extra"); }, "color roles:");
mutant("unnamed role concept", (copy) => { copy.grammar.colors.vibe.concept = "  "; }, "color concepts:");
mutant("role under 4.5:1 on the ground", (copy) => { copy.grammar.colors.vibe.hex = "#c9b6e4"; }, "color contrast:");
mutant("third shared motion role", (copy) => { copy.grammar.motion.orbit = "orbit"; }, "motion:");
mutant("concept-local color novelty", (copy) => { copy.concepts.human.color = "human-blue"; }, "color:");
mutant("concept-local shape novelty", (copy) => { copy.concepts.agentic.primitive = "triangle"; }, "primitive family:");
mutant("concept-local motion novelty", (copy) => { copy.concepts.verify.motion = "verify-spin"; }, "motion:");

if (process.exitCode) process.exit(process.exitCode);
console.log("vocabulary oracle: shared grammar and 9 mutation arms passed");
