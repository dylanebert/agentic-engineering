import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { concepts, grammar, pageGround, type Concept } from "../src/lib/vocabulary";

/**
 * Grammar oracle for the page's shared visual vocabulary: one primitive family, at most two
 * thickness roles, at most two motion roles, at most five color roles, every color role naming
 * the concept it carries at 4.5:1 against the page ground, and no concept-local novelty.
 *
 * The `binding:` arm was S1's owned red — a role earns its place only once it colors a prose
 * span in App.svelte *and* a part inside a figure component, which needed S4's spans and figure
 * motion to satisfy. S4 landed both, so the arm gates like every other one here and OWNED_RED
 * is gone. Every arm is mutation-proved in place at the bottom.
 */

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
// only if it colors a prose span in App.svelte *and* a part inside a figure component. The read
// and the predicate are separate so the predicate can be replayed against mutated role sets the
// way the grammar predicate is, without writing to the tree.
export type Binding = { prose: Set<string>; figures: Set<string> };

export function bindingViolations({ prose, figures }: Binding): string[] {
  const missing = Object.keys(grammar.colors).filter((role) => !prose.has(role) || !figures.has(role));
  return missing.length === 0
    ? []
    : [`binding: every role appears in both a prose span and a figure part (missing ${missing.join(", ")})`];
}

// A component's `<style>` block names every role it has a rule for, whether or not any element
// carries it, so both reads strip the style block first: the first mutation run of this arm
// survived on the CSS selectors alone. The prose side reads the span the binding is about, not a
// bare attribute.
const markup = (source: string): string => source.replace(/<style[\s\S]*?<\/style>/g, "");

function readBinding(): Binding {
  const spans = (source: string): Set<string> =>
    new Set(
      [...markup(source).matchAll(/<span class="term" data-role="([^"]+)"/g)].map((m) => m[1]),
    );
  // A figure part's role is often bound through the concept it draws (`data-role={node.role}`
  // over a `concepts.spec`-derived entry), so the read resolves that indirection: the roles a
  // component carries are its literal `data-role` values plus the declared color of every
  // concept it names. figures.spec.ts asserts the same property against the rendered tree,
  // where the binding is a fact rather than a source shape.
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

const production: Vocabulary = { grammar, concepts, ground: pageGround };
const productionBinding = readBinding();

const productionFailures = [...violations(production), ...bindingViolations(productionBinding)];
if (productionFailures.length > 0) {
  console.error(productionFailures.join("\n"));
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

/**
 * Binding mutation record (2026-09-02): deleting every `data-role="context"` span from
 * src/App.svelte, and separately moving the `spec` concept off the context role in
 * vocabulary.ts (which is what colors the loop figure's spec node), each returned exit 1 on
 * `binding: … (missing context)`; restoring each returned 0. An earlier pair of attempts
 * survived — the read was matching role names inside the `<style>` blocks — which is why the
 * read strips them.
 * The replays below keep both directions — a role bound in the figures but not the prose, and a
 * role bound in the prose but not the figures — durable at every gate run.
 */
function bindingMutant(name: string, change: (copy: Binding) => void): void {
  const copy: Binding = {
    prose: new Set(productionBinding.prose),
    figures: new Set(productionBinding.figures),
  };
  change(copy);
  const failures = bindingViolations(copy);
  if (!failures.some((failure) => failure.startsWith("binding:"))) {
    console.error(`mutation survived: ${name}; failures=${failures.join(" | ") || "none"}`);
    process.exitCode = 1;
    return;
  }
  console.log(`mutation rejected: ${name} -> binding:`);
}

bindingMutant("role dropped from the prose", (copy) => { copy.prose.delete("context"); });
bindingMutant("role dropped from the figures", (copy) => { copy.figures.delete("vibe"); });

if (process.exitCode) process.exit(process.exitCode);
console.log("vocabulary oracle: shared grammar, role binding, and 11 mutation arms passed");
