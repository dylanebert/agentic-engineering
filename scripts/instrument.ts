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
    "needle": "Agentic engineering is directing agents to make software.",
    "replacement": "Changed article text is directing agents to make software.",
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
    "label": "hero no area fill",
    "path": "src/lib/Overture.svelte",
    "needle": ".spectrum path,.spectrum rect,.spectrum circle{fill:none",
    "replacement": ".spectrum path,.spectrum rect,.spectrum circle{fill:currentColor",
    "grep": "DOM spectrum uses strokes without area tint",
    "predicate": "figure-10.1"
  },
  {
    "label": "static hero import",
    "path": "src/lib/Overture.svelte",
    "needle": [
      "  import { cubeFrames } from \"./cube-frames\";",
      "          const { mountHero } = await import(\"./hero-engine\");"
    ],
    "replacement": [
      "  import { cubeFrames } from \"./cube-frames\";\n  import { mountHero } from \"./hero-engine\";",
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
    "needle": "claim: \"Then repeat: implement a stage, verify it, implement the next, until the spec is done.\"",
    "replacement": "claim: \"Then repeat: implement a task, validate it, implement the next, until the work is done.\"",
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
    "needle": "{ role: concepts.spec.color, label: concepts.spec.label, x: 14, step: 0 },",
    "replacement": "{ role: concepts.spec.color, label: concepts.spec.label, x: 300, step: 0 },",
    "grep": "order the prose states",
    "predicate": "figure-16.2"
  },
  {
    "label": "return edge lands on the stage node",
    "path": "src/lib/StageLoop.svelte",
    "needle": "data-figure-part=\"return-edge\"\n        d=\"M 460 {top + height} L 460 100 L 274 100 L 274 {top + height}\"",
    "replacement": "data-figure-part=\"return-edge\"\n        d=\"M 460 {top + height} L 460 100 L 88 100 L 88 {top + height}\"",
    "grep": "lands on the stage node",
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
    "needle": "x2=\"200\" y2={top + height / 2}",
    "replacement": "x2=\"192\" y2={top + height / 2}",
    "grep": "every loop connector meets",
    "predicate": "figure-19.1"
  },
  {
    "label": "loop eased approach",
    "path": "src/lib/StageLoop.svelte",
    "needle": "offset-distance: calc((var(--phase, 1) - (\n      sin(var(--phase, 1) * 360deg) +\n      sin(var(--phase, 1) * 720deg) * 1.33791876 +\n      sin(var(--phase, 1) * 1080deg) * 0.60019838\n    ) * 0.006) * 100%);",
    "replacement": "offset-distance: calc(var(--phase, 1) * 100%);",
    "grep": "non-constant speed",
    "predicate": "figure-20.1"
  },
  {
    "label": "loop indicator absent at rest",
    "path": "src/lib/StageLoop.svelte",
    "needle": "r: calc(7px * max(\n      clamp(0, calc(1 - var(--phase, 1) * 18), 1),\n      clamp(0, calc(1 - abs(var(--phase, 1) - 0.2784) * 32), 1),\n      clamp(0, calc(1 - abs(var(--phase, 1) - 0.5569) * 32), 1),\n      clamp(0, calc(1 - abs(var(--phase, 1) - 0.84) * 12), 1)\n    ));",
    "replacement": "r: 7px;",
    "grep": "reduced-motion rest",
    "predicate": "figure-22.5"
  },
  {
    "label": "loop traveling unit",
    "path": "src/lib/StageLoop.svelte",
    "needle": "offset-distance: calc((var(--phase, 1) - (\n      sin(var(--phase, 1) * 360deg) +\n      sin(var(--phase, 1) * 720deg) * 1.33791876 +\n      sin(var(--phase, 1) * 1080deg) * 0.60019838\n    ) * 0.006) * 100%);",
    "replacement": "offset-distance: 100%;",
    "grep": "one unit travels",
    "predicate": "figure-21.3"
  },
  {
    "label": "loop occupied-node emphasis",
    "path": "src/lib/StageLoop.svelte",
    "needle": "opacity: clamp(0, calc(1 - abs(var(--phase, 1) - 0.5569) * 12), 1);",
    "replacement": "opacity: 0;",
    "grep": "one unit travels",
    "predicate": "figure-21.2"
  },
  {
    "label": "loop return dash offset",
    "path": "src/lib/StageLoop.svelte",
    "needle": "stroke-dashoffset: clamp(0px, calc((1 - var(--phase, 1)) * 225.7px), 100px);",
    "replacement": "stroke-dashoffset: 0;",
    "grep": "one unit travels",
    "predicate": "figure-21.8"
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
    "needle": "cubeFrames[2].join(\"\\n\")",
    "replacement": "cubeFrames[2].slice(1).join(\"\\n\")",
    "grep": "reduced motion rests",
    "predicate": "figure-9.2"
  },
  {
    "label": "new hero invisible GPU canvas",
    "path": "src/lib/Overture.svelte",
    "needle": "canvas.drawn{opacity:1}",
    "replacement": "canvas.drawn{opacity:0}",
    "grep": "real WebGPU acquisition",
    "predicate": "figure-11.4",
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
    "grep": "three rendered treatments",
    "predicate": "figure-12.2",
    "cohort": "gpu"
  },
  {
    "label": "plain fallback hidden",
    "path": "src/lib/Overture.svelte",
    "needle": "pre{margin:0;",
    "replacement": "pre{visibility:hidden;margin:0;",
    "grep": "real WebGPU acquisition",
    "predicate": "figure-11.7"
  }
];

if (import.meta.main) {
  const selection = process.argv.includes("--pure") ? "pure" : process.argv.includes("--narrow") ? "narrow" : process.argv.includes("--runner") ? "runner" : "R3";
  await campaign(selection, mutations);
}
