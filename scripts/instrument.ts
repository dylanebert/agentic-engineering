import { campaign, type Mutation } from "./campaign";

export const mutations: Mutation[] = [
  {
    "label": "missing-asset server",
    "mode": "fallback",
    "grep": "missing assets",
    "predicate": "figure-2.1"
  },
  {
    "label": "neutral hierarchy",
    "path": "src/app.css",
    "needle": "--heading-font-size: 20px",
    "replacement": "--heading-font-size: 15px",
    "grep": "neutral hierarchy",
    "predicate": "figure-3.1"
  },
  {
    "label": "readable measure",
    "path": "src/app.css",
    "needle": "--measure: 548px",
    "replacement": "--measure: 700px",
    "grep": "readable long-form band",
    "predicate": "figure-4.2"
  },
  {
    "label": "strong emphasis",
    "path": "src/app.css",
    "needle": "--emphasis-font-weight: 600",
    "replacement": "--emphasis-font-weight: 400",
    "grep": "production strong emphasis",
    "predicate": "figure-6.1"
  },
  {
    "label": "story non-interference",
    "path": "src/App.svelte",
    "needle": "intentionally to build and verify software.",
    "replacement": "accidentally to break and discard software.",
    "grep": "non-interference",
    "predicate": "figure-7.1"
  },
  {
    "label": "selected desktop measure",
    "path": "src/app.css",
    "needle": "--measure: 548px",
    "replacement": "--measure: 700px",
    "grep": "shipped desktop measure",
    "predicate": "figure-5.1"
  },
  {
    "label": "hero register",
    "path": "src/lib/Overture.svelte",
    "needle": "data-hero-id=\"spectrum-hero\"",
    "replacement": "data-retired-hero-id=\"spectrum-hero\"",
    "grep": "exactly one unlabeled three-state hero",
    "predicate": "figure-8.1"
  },
  {
    "label": "hero zero-label policy",
    "path": "src/lib/Overture.svelte",
    "needle": "aria-hidden=\"true\">",
    "replacement": "aria-hidden=\"true\"><span data-figure-label>forbidden</span>",
    "grep": "exactly one unlabeled three-state hero",
    "predicate": "figure-8.1"
  },
  {
    "label": "hero rail left unfilled",
    "path": "src/lib/Overture.svelte",
    "needle": ".spectrum .rail{fill:none",
    "replacement": ".spectrum .rail{fill:currentColor",
    "grep": "rails stay unfilled",
    "predicate": "figure-10.2"
  },
  {
    "label": "static hero import",
    "path": "src/lib/Overture.svelte",
    "needle": [
      "  import { cubeFrame } from \"./cube-frames\";",
      "      const { mountHero } = await import(\"./hero-engine\");"
    ],
    "replacement": [
      "  import { cubeFrame } from \"./cube-frames\";\n  import { mountHero } from \"./hero-engine\";",
      ""
    ],
    "predicate": "",
    "buildRed": "lazy hero chunk is missing"
  },
  {
    "label": "hero chunk budget",
    "path": "vite.config.ts",
    "needle": "export const HERO_GZIP_BUDGET = 200_000;",
    "replacement": "export const HERO_GZIP_BUDGET = 1;",
    "predicate": "",
    "buildRed": "exceeds 1"
  },
  {
    "label": "figure count against the manifest",
    "path": "src/App.svelte",
    "needle": "\n    <StageLoop />\n",
    "replacement": "\n",
    "grep": "declared site",
    "predicate": "figure-13.1"
  },
  {
    "label": "figure claim against its lead-in paragraph",
    "path": "src/lib/figures.ts",
    "needle": "claim: \"Repeat: implement the next stage, verify again, until the spec is done.\"",
    "replacement": "claim: \"Repeat: implement the next task, verify again, until the work is done.\"",
    "grep": "quoted claim",
    "predicate": "figure-14.3"
  },
  {
    "label": "figcaption absence",
    "path": "src/lib/Figure.svelte",
    "needle": "{@render children({ elapsed, reduced })}",
    "replacement": "{@render children({ elapsed, reduced })}\n  <figcaption>a caption</figcaption>",
    "grep": "figcaption anywhere",
    "predicate": "figure-15.1"
  },
  {
    "label": "no figure above the opening section",
    "path": "src/App.svelte",
    "needle": "<h1 class=\"title\">agentic engineering</h1>",
    "replacement": "<h1 class=\"title\">agentic engineering</h1>\n    <StageLoop />",
    "grep": "figcaption anywhere",
    "predicate": "figure-15.2"
  },
  {
    "label": "ordered geometry in the stage loop",
    "path": "src/lib/StageLoop.svelte",
    "needle": "{ role: concepts.spec.color, label: concepts.spec.label, x: 14 },",
    "replacement": "{ role: concepts.spec.color, label: concepts.spec.label, x: 300 },",
    "grep": "order the prose states",
    "predicate": "figure-16.2"
  },
  {
    "label": "return edge lands on the implement node",
    "path": "src/lib/StageLoop.svelte",
    "needle": "d=\"M460 56V100H274V60\"",
    "replacement": "d=\"M460 56V100H88V60\"",
    "grep": "lands on the implement node",
    "predicate": "figure-17.3"
  },
  {
    "label": "figure label against its claim",
    "path": "src/lib/vocabulary.ts",
    "needle": "verify: { label: \"verify\", color: \"verify\"",
    "replacement": "verify: { label: \"validate\", color: \"verify\"",
    "grep": "substring of its claim",
    "predicate": "figure-18.4"
  },
  {
    "label": "loop connector endpoints",
    "path": "src/lib/StageLoop.svelte",
    "needle": "<path class=\"rail\" d=\"M162 34H196\"",
    "replacement": "<path class=\"rail\" d=\"M120 34H196\"",
    "grep": "every loop connector meets",
    "predicate": "figure-19.1"
  },
  {
    "label": "loop eased approach",
    "path": "src/lib/StageLoop.svelte",
    "needle": "    0%, 4% { offset-distance: 0%; animation-timing-function: cubic-bezier(.37,0,.63,1); }",
    "replacement": "    0%, 4% { offset-distance: 0%; animation-timing-function: linear; }",
    "grep": "non-constant speed",
    "predicate": "figure-20.1"
  },
  {
    "label": "loop indicator absent at rest",
    "path": "src/lib/StageLoop.svelte",
    "needle": "    .dot { r: 0; }",
    "replacement": "    .dot { r: 5px; }",
    "grep": "reduced-motion rest",
    "predicate": "figure-22.5"
  },
  {
    "label": "loop unit absent where a box is solid",
    "path": "src/lib/StageLoop.svelte",
    "needle": "0%, 4%, 8%, 22%, 26%, 40%, 52%, 66%, 70%, 100% { r: 0; }",
    "replacement": "0%, 4%, 8%, 22%, 26%, 40%, 52%, 66%, 70%, 100% { r: 5; }",
    "grep": "one unit travels the rails",
    "predicate": "figure-21.3"
  },
  {
    "label": "loop landed-node solid box",
    "path": "src/lib/StageLoop.svelte",
    "needle": "10%, 22%, 54%, 66% { fill: currentColor;",
    "replacement": "10%, 22%, 54%, 66% { fill: var(--bg);",
    "grep": "one unit travels the rails",
    "predicate": "figure-21.2"
  },
  {
    "label": "loop return edge drawn at rest",
    "path": "src/lib/StageLoop.svelte",
    "needle": "data-figure-part=\"return-edge\" d=\"M460 56V100H274V60\"",
    "replacement": "data-figure-part=\"return-edge\" d=\"M460 56\"",
    "grep": "reduced-motion rest",
    "predicate": "figure-22.4"
  },
  {
    "label": "reduced-motion rest",
    "path": "src/lib/Figure.svelte",
    "needle": "const reduced = window.matchMedia(\"(prefers-reduced-motion: reduce)\").matches;",
    "replacement": "const reduced = false;",
    "grep": "reduced-motion rest",
    "predicate": "figure-22.2"
  },
  {
    "label": "role bound in a prose span",
    "path": "src/App.svelte",
    "needle": "<span class=\"term\" data-role=\"prose\">human code</span>",
    "replacement": "human code",
    "grep": "bound to both",
    "predicate": "figure-23.1"
  },
  {
    "label": "role bound in a figure part",
    "path": "src/lib/vocabulary.ts",
    "needle": "spec: { label: \"spec\", color: \"context\", ...shape }",
    "replacement": "spec: { label: \"spec\", color: \"agentic\", ...shape }",
    "grep": "bound to both",
    "predicate": "figure-23.2"
  },
  {
    "label": "golden screenshot pixels",
    "mode": "golden",
    "grep": "capture desktop.png",
    "predicate": "capture-2.2"
  },
  {
    "label": "new hero captured rest rows",
    "path": "src/lib/Overture.svelte",
    "needle": "cubeFrame.join(\"\\n\")",
    "replacement": "cubeFrame.slice(1).join(\"\\n\")",
    "grep": "reduced motion rests",
    "predicate": "figure-9.2"
  },
  {
    "label": "new hero invisible GPU canvas",
    "path": "src/lib/Overture.svelte",
    "needle": [
      "canvas.drawn{opacity:calc(1 - .9 * var(--veil))",
      "canvas.drawn{opacity:calc(1 - .9 * var(--veil))"
    ],
    "replacement": [
      "canvas.drawn{opacity:calc(0 * var(--veil))",
      "canvas.drawn{opacity:calc(0 * var(--veil))"
    ],
    "predicate": "runtime.agentic.region",
    "runtime": true,
    "cohort": "gpu"
  },
  {
    "label": "new hero Cells identity malformed",
    "path": "src/lib/Overture.svelte",
    "needle": [
      "root.dataset.heroCells = grid",
      "root.dataset.heroCells = grid"
    ],
    "replacement": [
      "root.dataset.heroCells = \"invalid\"",
      "root.dataset.heroCells = \"invalid\""
    ],
    "predicate": "runtime.agentic.identity",
    "runtime": true,
    "cohort": "gpu"
  },
  {
    "label": "plain fallback hidden",
    "path": "src/lib/Overture.svelte",
    "needle": [
      "pre{margin:0;",
      "pre{margin:0;"
    ],
    "replacement": [
      "pre{visibility:hidden;margin:0;",
      "pre{visibility:hidden;margin:0;"
    ],
    "grep": "plain Chromium keeps silent rest",
    "predicate": "figure-11.7"
  }
];

if (import.meta.main) {
  const selection = process.argv.includes("--runtime-witnesses") ? "runtime-witnesses" : process.argv.includes("--pure") ? "pure" : process.argv.includes("--narrow") ? "narrow" : process.argv.includes("--runner") ? "runner" : "R3";
  await campaign(selection, mutations);
}
