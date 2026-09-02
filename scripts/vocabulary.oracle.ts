import { heroConcepts, heroGrammar, type HeroConcept } from "../src/lib/hero";

type Grammar = {
  primitiveFamily: string;
  thickness: Record<string, string>;
  colors: Record<string, { token: string; semantic: string }>;
  motion: Record<string, string>;
};

type Vocabulary = { grammar: Grammar; concepts: Record<string, HeroConcept | Record<string, string>> };

export function violations({ grammar, concepts }: Vocabulary): string[] {
  const failures: string[] = [];
  if (new Set(Object.values(concepts).map((concept) => concept.primitive)).size !== 1 ||
      Object.values(concepts).some((concept) => concept.primitive !== grammar.primitiveFamily)) {
    failures.push("primitive family: exactly one declared family is shared by every concept");
  }
  if (Object.keys(grammar.thickness).length > 2 ||
      Object.values(concepts).some((concept) => !(concept.thickness in grammar.thickness))) {
    failures.push("thickness: at most two declared roles and no concept-local role");
  }
  const accents = Object.values(grammar.colors).filter((color) => color.semantic !== "page-neutral");
  if (accents.length > 1 || accents.some((accent) => accent.semantic.trim() === "")) {
    failures.push("color: page neutrals plus at most one semantically named accent");
  }
  if (Object.values(concepts).some((concept) => !(concept.color in grammar.colors))) {
    failures.push("color: no concept-local color novelty");
  }
  if (Object.keys(grammar.motion).length > 2) failures.push("motion: at most two shared roles");
  if (Object.values(concepts).some((concept) => !(concept.motion in grammar.motion))) {
    failures.push("motion: no concept-local motion novelty");
  }
  return failures;
}

const production: Vocabulary = { grammar: heroGrammar, concepts: heroConcepts };
const productionFailures = violations(production);
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
 * mixed primitive family, third thickness role, second accent, third motion role, and
 * concept-local color/shape/motion values. A mutant is restored by structuredClone isolation.
 */
mutant("mixed primitive family", (copy) => { copy.concepts.vibe.primitive = "circle"; }, "primitive family:");
mutant("third thickness role", (copy) => { copy.grammar.thickness.detail = "2px"; }, "thickness:");
mutant("second semantic accent", (copy) => { copy.grammar.colors.warning = { token: "--warning", semantic: "warning" }; }, "color:");
mutant("third shared motion role", (copy) => { copy.grammar.motion.orbit = "orbit"; }, "motion:");
mutant("concept-local color novelty", (copy) => { copy.concepts.human.color = "human-blue"; }, "color:");
mutant("concept-local shape novelty", (copy) => { copy.concepts.agentic.primitive = "triangle"; }, "primitive family:");
mutant("concept-local motion novelty", (copy) => { copy.concepts.verify.motion = "verify-spin"; }, "motion:");

if (process.exitCode) process.exit(process.exitCode);
console.log("vocabulary oracle: shared grammar and 7 mutation arms passed");
