// The four round-1 typography candidates (spec stage S3, contact sheet). Each candidate is one
// composed neutral-state reading system — body weight, hierarchy, measure, and section rhythm
// vary together; no candidate is a scalar weight rung. Everything else is held: the IBM Plex Sans
// body face and the Outfit heading face (--sans/--display are never overridden), the prose, the
// figures, the palette tokens (colors are consumed from the existing neutral set — the hierarchy
// channel moves section headings from --text-muted to the existing --ink token; no new color
// values exist in any candidate), the viewport, the crop, and the scroll position.
//
// The candidates are temporary by design: the runner injects them at runtime over the built
// neutral page (a later stylesheet wins at equal specificity), so no production style file moves
// for the sheet. All are removed or folded into the winner before S4 ships.
//
// FONT_URL_EXTRA loads the body weights the sheet needs that index.html does not request (the
// page loads IBM Plex Sans 600/700 and Outfit 500/600). Without it, a 400/500 request silently
// renders the 600 face and every "weight varies" claim is vacuous — the fonts arm measures the
// canvas width of the requested weight against the 600 face to prove the real face rendered.
// S4 folds the winning weights into index.html; until then this link exists only inside the
// contact-sheet run.

export const FONT_URL_EXTRA =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&family=Outfit:wght@700&display=swap";

export interface Candidate {
  /** Sheet label key ("a".."d"); the sheet shows the bare letter, never a rationale. */
  key: string;
  recorded: {
    bodyWeight: string;
    bodySize: string;
    lineHeight: string;
    headingSize: string;
    headingWeight: string;
    headingGap: string;
    measure: string;
    sectionGap: string;
    paraGap: string;
  };
  /** Injected over the built neutral page by the contact-sheet spec. */
  css: string;
}

// Candidate A — "grounded": light body, ink headings, slightly narrowed measure, one clear
// section step. The minimal move from the shipped 600-everywhere state.
const a: Candidate = {
  key: "a",
  recorded: {
    bodyWeight: "400",
    bodySize: "16px",
    lineHeight: "1.6",
    headingSize: "19px",
    headingWeight: "600",
    headingGap: "14px",
    measure: "620px",
    sectionGap: "56px",
    paraGap: "14px",
  },
  css: `:root {
  --body-font-weight: 400;
  --body-line-height: 1.6;
  --heading-font-size: 19px;
  --heading-font-weight: 600;
  --heading-color: var(--ink);
  --heading-margin-bottom: 14px;
  --measure: 620px;
}
.page .section { margin-top: 56px; }
.page .section p { margin-top: 14px; }
/* MUT1 */
`,
};

// Candidate B — "editorial": light body with taller leading, the largest headings of the sheet,
// the widest measure, and the strongest air between paragraphs.
const b: Candidate = {
  key: "b",
  recorded: {
    bodyWeight: "400",
    bodySize: "16px",
    lineHeight: "1.7",
    headingSize: "21px",
    headingWeight: "600",
    headingGap: "16px",
    measure: "640px",
    sectionGap: "72px",
    paraGap: "16px",
  },
  css: `:root {
  --body-font-weight: 400;
  --body-line-height: 1.7;
  --heading-font-size: 21px;
  --heading-font-weight: 600;
  --heading-color: var(--ink);
  --heading-margin-bottom: 16px;
  --measure: 640px;
}
.page .section { margin-top: 72px; }
.page .section p { margin-top: 16px; }
/* MUT2 */
/* MUT5 */
`,
};

// Candidate C — "tuned-dense": keeps the brand 600 body weight and tightens everything else —
// the "keep the weight, fix the hierarchy and the measure" arm. Narrowest measure of the sheet.
const c: Candidate = {
  key: "c",
  recorded: {
    bodyWeight: "600",
    bodySize: "16px",
    lineHeight: "1.5",
    headingSize: "17px",
    headingWeight: "700",
    headingGap: "12px",
    measure: "580px",
    sectionGap: "44px",
    paraGap: "12px",
  },
  css: `:root {
  --body-font-weight: 600;
  --body-line-height: 1.5;
  --heading-font-size: 17px;
  --heading-font-weight: 700;
  --heading-color: var(--ink);
  --heading-margin-bottom: 12px;
  --measure: 580px;
}
.page .section { margin-top: 44px; }
.page .section p { margin-top: 12px; }
/* MUT3 */
`,
};

// Candidate D — "spaced": middle body weight, bold headings, the widest section separation of
// the sheet — the arm that spends its budget on section boundaries rather than line texture.
const d: Candidate = {
  key: "d",
  recorded: {
    bodyWeight: "500",
    bodySize: "16px",
    lineHeight: "1.65",
    headingSize: "18px",
    headingWeight: "700",
    headingGap: "18px",
    measure: "600px",
    sectionGap: "88px",
    paraGap: "18px",
  },
  css: `:root {
  --body-font-weight: 500;
  --body-line-height: 1.65;
  --heading-font-size: 18px;
  --heading-font-weight: 700;
  --heading-color: var(--ink);
  --heading-margin-bottom: 18px;
  --measure: 600px;
}
.page .section { margin-top: 88px; }
.page .section p { margin-top: 18px; }
/* MUT4 */
/* MUT7 */
`,
};

export const candidates: Candidate[] = [a, b, c, d];
