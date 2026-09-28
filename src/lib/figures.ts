// Figure and overture declarations for the rendered page.
//
// One explanatory figure remains on this page (spec H2): the loop in the loop section. Each entry
// names its site — the section id and zero-based lead-in paragraph — quotes that paragraph's claim
// so fidelity is checkable against rendered text, and declares its label policy. The paragraph
// before a figure does the caption's job; there are no figcaptions.
//
// H2 retires the duplicated spectrum axis after H1 moved that vocabulary into the overture. P2
// moves the loop after the full spec → implement → verify disclosure; its return geometry stays
// intact. The hand repair dropped the standalone definition and closing sections, leaving the six
// section and subsection ids declared below.

export type FigureKind = "loop";
export type LabelPolicy = "none" | "required";

export type FigureEntry = {
  /** Stable id for the figure component and its arms. */
  id: string;
  /** The `id` of the `section` the figure sits in. */
  section: string;
  /** Zero-based index of the lead-in paragraph among that section's own `p` children. */
  paragraph: number;
  /** Quoted verbatim from that lead-in paragraph. Must be a substring of the rendered text. */
  claim: string;
  kind: FigureKind;
  /** An explanatory figure labels its parts out of its own section's prose. */
  labels: LabelPolicy;
};

export const figures = [
  {
    id: "stage-loop",
    section: "loop",
    paragraph: 1,
    claim: "Repeat: implement the next stage, verify again, until the spec is done.",
    kind: "loop",
    labels: "required",
  },
] satisfies readonly FigureEntry[];

// The overture (spec Locked decision, criteria 5, 7 and 8). R1 declares it; H1 mounts it above the
// opening section and partitions the register, label, role, phase and reduced-motion arms by
// `kind`. It sits in no section, carries no beat and no claim, and shows zero label nodes: it is a
// vocabulary key, not an assertion. Each state names the prose term the page spends later, so
// "every overture state is named later in the prose" is a substring check, and each state's role is
// one of the five declared in src/lib/vocabulary.ts.

export type OvertureState = {
  /** Left to right in the overture: human on the left, agentic in the middle, vibe on the right. */
  state: "human" | "agentic" | "vibe";
  /** The prose term this state is keyed to. A substring of the spectrum section's prose. */
  term: string;
  /** A declared color role in src/lib/vocabulary.ts. */
  role: "prose" | "agentic" | "vibe";
  /** The canvas treatment bound to this spectrum state. */
  treatment: "shallot" | "cells" | "glow";
};

export const overture: {
  id: string;
  kind: "hero";
  labels: "none";
  canvas: "one";
  /** Above the opening section, so it belongs to no section and carries no beat. */
  site: "above-opening";
  /** At rest (phase 1) the overture settles on the agentic state. */
  rest: "agentic";
  states: readonly OvertureState[];
} = {
  id: "spectrum-overture",
  kind: "hero",
  labels: "none",
  canvas: "one",
  site: "above-opening",
  rest: "agentic",
  states: [
    { state: "human", term: "human code", role: "prose", treatment: "shallot" },
    { state: "agentic", term: "agentic engineering", role: "agentic", treatment: "cells" },
    { state: "vibe", term: "vibe coding", role: "vibe", treatment: "glow" },
  ],
};

// The narrative's declared section and subsection order. R1 grouped the numbered principles
// beneath one Principles section, so entries name their level as well as their id.

export type Beat = {
  /** The `id` of the section or subsection carrying this beat. */
  section: string;
  /** Whether that id is a top-level `section.section` or a `section.principle` subsection. */
  level: "section" | "subsection";
};

export const beats = [
  { section: "spectrum", level: "section" },
  { section: "principles", level: "section" },
  { section: "verifiability", level: "subsection" },
  { section: "context-engineering", level: "subsection" },
  { section: "loop", level: "section" },
  { section: "verification", level: "section" },
] satisfies readonly Beat[];

/** Section and subsection ids in declared narrative order, which is also document order. */
export const sectionOrder: readonly string[] = beats.map((b) => b.section);
