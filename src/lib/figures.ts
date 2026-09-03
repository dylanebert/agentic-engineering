// The figure manifest, the overture declaration, and the manuscript's beat map.
//
// Two explanatory figures on this page and only two (spec, locked): the spectrum axis in the
// spectrum section and the loop in the loop section. Each entry names its site — the section's id
// and the zero-based index of its lead-in paragraph among that section's own `p` children — quotes
// that paragraph's claim verbatim so claim fidelity is checkable by substring against the rendered
// text, and declares its label policy. The paragraph before a figure does the caption's job; there
// are no figcaptions.
//
// R1 re-declared the sites after the prose rebuild: the spectrum section now opens with a framing
// paragraph and gives each spectrum point its own block, so the axis's lead-in moved from
// paragraph 1 to paragraph 3. Both claims are unchanged, which keeps the S5(c) lead-in decision
// and the loop's return-edge geometry claim intact. H1 mounts the overture declared below and
// partitions the arms by register; H2 retires the spectrum entry and its component.

export type FigureKind = "axis" | "loop";
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
    id: "spectrum-axis",
    section: "spectrum",
    paragraph: 3,
    claim: "Between vibe coding and human code is a whole space, and agentic engineering lives there",
    kind: "axis",
    labels: "required",
  },
  {
    id: "stage-loop",
    section: "loop",
    paragraph: 1,
    claim: "Then repeat: stage, verify, stage again, until the spec is done.",
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
  /** How the one pose-identical cube is rendered for this state. */
  skin: "shaded" | "ascii" | "glow";
};

export const overture: {
  id: string;
  kind: "overture";
  labels: "none";
  /** Above the opening section, so it belongs to no section and carries no beat. */
  site: "above-opening";
  /** At rest (phase 1) the overture settles on the agentic state. */
  rest: "agentic";
  states: readonly OvertureState[];
} = {
  id: "spectrum-overture",
  kind: "overture",
  labels: "none",
  site: "above-opening",
  rest: "agentic",
  states: [
    { state: "human", term: "human code", role: "prose", skin: "shaded" },
    { state: "agentic", term: "agentic engineering", role: "agentic", skin: "ascii" },
    { state: "vibe", term: "vibe coding", role: "vibe", skin: "glow" },
  ],
};

// The manuscript's beats, in the manuscript's order, each anchored to a line quoted verbatim from
// manuscripts/agentic-engineering/script.txt and mapped to the section or subsection carrying it.
// The article is the manuscript's beats in the manuscript's order (spec, locked), so the page's
// section order is this list's order. R1 grouped the two numbered principles into subsections of
// one Principles section, so a beat now names its level too, and the section carrying the
// "we've tried enough things" beat earns its own anchor.

export type Beat = {
  /** A line quoted verbatim from the manuscript. */
  anchor: string;
  /** The `id` of the section or subsection carrying this beat. */
  section: string;
  /** Whether that id is a top-level `section.section` or a `section.principle` subsection. */
  level: "section" | "subsection";
};

export const beats = [
  { anchor: "directing agents", section: "definition", level: "section" },
  { anchor: "you may have heard of vibe coding", section: "spectrum", level: "section" },
  { anchor: "but we've tried enough things", section: "principles", level: "section" },
  { anchor: "principle number 1", section: "verifiability", level: "subsection" },
  { anchor: "context engineering", section: "context-engineering", level: "subsection" },
  { anchor: "let's put these principles together", section: "loop", level: "section" },
  { anchor: "how exactly do you \"verify\"?", section: "verification", level: "section" },
  { anchor: "the application of these principles", section: "closing", level: "section" },
] satisfies readonly Beat[];

/** Section and subsection ids in the manuscript's beat order, which is also document order. */
export const sectionOrder: readonly string[] = beats.map((b) => b.section);
