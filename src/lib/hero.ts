export const heroGrammar = {
  primitiveFamily: "rounded-rectangle",
  thickness: {
    structure: "1px",
    emphasis: "3px",
  },
  colors: {
    canvas: { token: "--surface-2", semantic: "page-neutral" },
    ink: { token: "--text-muted", semantic: "page-neutral" },
    line: { token: "--border", semantic: "page-neutral" },
    accent: { token: "--hero-active-step", semantic: "active-step" },
  },
  motion: {
    reveal: "reveal",
    emphasis: "emphasis",
  },
} as const;

export type PrimitiveFamily = typeof heroGrammar.primitiveFamily;
export type ThicknessRole = keyof typeof heroGrammar.thickness;
export type ColorRole = keyof typeof heroGrammar.colors;
export type MotionRole = keyof typeof heroGrammar.motion;

export type HeroConcept = {
  label: string;
  primitive: PrimitiveFamily;
  thickness: ThicknessRole;
  color: ColorRole;
  motion: MotionRole;
};

const sharedConcept = {
  primitive: heroGrammar.primitiveFamily,
  thickness: "structure",
  color: "ink",
  motion: "reveal",
} as const;

export const heroConcepts = {
  vibe: { label: "Vibe", ...sharedConcept },
  human: { label: "Human", ...sharedConcept },
  agentic: { label: "Agentic", ...sharedConcept },
  verifiability: { label: "Verifiability", ...sharedConcept },
  context: { label: "Context engineering", ...sharedConcept },
  plan: { label: "Plan", ...sharedConcept },
  stage: { label: "Stage", ...sharedConcept },
  verify: { label: "Verify", ...sharedConcept },
} satisfies Record<string, HeroConcept>;
