// The figure manifest. Two figures on this page and only two (spec, locked): the spectrum axis
// at the introduction, and the loop at the stages flow. Each entry names its site (the section's
// id and the zero-based index of its lead-in paragraph within that section) and quotes the claim
// that paragraph makes, verbatim, so claim fidelity is checkable by substring against the
// rendered text. The paragraph before a figure does the caption's job; there are no figcaptions.
// S2 declares the manifest; S3 mounts one component per entry at its declared site.

export type FigureKind = "axis" | "loop";

export type FigureEntry = {
  /** Stable id for the figure component and its arms. */
  id: string;
  /** The `id` of the `section` the figure sits in. */
  section: string;
  /** Zero-based index of the lead-in paragraph among that section's `p` elements. */
  paragraph: number;
  /** Quoted verbatim from that lead-in paragraph. Must be a substring of the rendered text. */
  claim: string;
  kind: FigureKind;
};

export const figures = [
  {
    id: "spectrum-axis",
    section: "spectrum",
    paragraph: 1,
    claim: "A whole space sits between them, and agentic engineering lives there",
    kind: "axis",
  },
  {
    id: "stage-loop",
    section: "loop",
    paragraph: 1,
    claim: "Then repeat, in a loop, until the spec is done.",
    kind: "loop",
  },
] satisfies readonly FigureEntry[];

// The manuscript's beats, in the manuscript's order, each anchored to a line quoted verbatim
// from manuscripts/agentic-engineering/script.txt and mapped to the section carrying it. The
// article is the manuscript's beats in the manuscript's order (spec, locked), so the page's
// section order is this list's order; the manifest arm checks both halves.

export type Beat = {
  /** A line quoted verbatim from the manuscript. */
  anchor: string;
  /** The `id` of the section carrying this beat. */
  section: string;
};

export const beats = [
  { anchor: "directing agents", section: "definition" },
  { anchor: "you may have heard of vibe coding", section: "spectrum" },
  { anchor: "principle number 1", section: "verifiability" },
  { anchor: "context engineering", section: "context-engineering" },
  { anchor: "let's put these principles together", section: "loop" },
  { anchor: "how exactly do you \"verify\"?", section: "verification" },
  { anchor: "the application of these principles", section: "closing" },
] satisfies readonly Beat[];

/** Section ids in the manuscript's beat order. */
export const sectionOrder: readonly string[] = beats.map((b) => b.section);
