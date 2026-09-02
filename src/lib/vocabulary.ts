// The page's shared visual vocabulary: one primitive family, two thickness roles, two motion
// roles, and at most five color roles. Each color role names the concept it carries, and every
// concept in the article draws its color from a declared role — no concept-local novelty.
// Hex values are the composited page colors, checked against the page ground at 4.5:1 by
// scripts/vocabulary.oracle.ts.

export const pageGround = "#fbfcfd";

export const grammar = {
  primitiveFamily: "rounded-rectangle",
  thickness: {
    structure: "1px",
    emphasis: "3px",
  },
  colors: {
    prose: { token: "--role-prose", hex: "#363c44", concept: "page prose" },
    vibe: { token: "--role-vibe", hex: "#6b3fa0", concept: "vibe coding" },
    agentic: { token: "--role-agentic", hex: "#1f6f5c", concept: "agentic engineering" },
    verify: { token: "--role-verify", hex: "#9a3412", concept: "verification" },
    context: { token: "--role-context", hex: "#3a5a80", concept: "context engineering" },
  },
  motion: {
    reveal: "reveal",
    emphasis: "emphasis",
  },
} as const;

export type PrimitiveFamily = typeof grammar.primitiveFamily;
export type ThicknessRole = keyof typeof grammar.thickness;
export type ColorRole = keyof typeof grammar.colors;
export type MotionRole = keyof typeof grammar.motion;

export type Concept = {
  label: string;
  primitive: PrimitiveFamily;
  thickness: ThicknessRole;
  color: ColorRole;
  motion: MotionRole;
};

const shape = {
  primitive: grammar.primitiveFamily,
  thickness: "structure",
  motion: "reveal",
} as const;

export const concepts = {
  vibe: { label: "Vibe", color: "vibe", ...shape },
  human: { label: "Human", color: "prose", ...shape },
  agentic: { label: "Agentic", color: "agentic", ...shape },
  verifiability: { label: "Verifiability", color: "verify", ...shape },
  context: { label: "Context engineering", color: "context", ...shape },
  spec: { label: "Spec", color: "agentic", ...shape },
  stage: { label: "Stage", color: "agentic", ...shape },
  verify: { label: "Verify", color: "verify", ...shape },
} satisfies Record<string, Concept>;
