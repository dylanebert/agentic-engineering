import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDisplay } from "./display";
import { playwrightVersion } from "./playwright-version";

const repo = join(import.meta.dir, "..");
const work = join(tmpdir(), "agentic-engineering-instrument");

function run(command: string[], cwd: string): void {
  const result = Bun.spawnSync(command, { cwd, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) throw new Error(`instrument: '${command.join(" ")}' failed (exit ${result.exitCode})`);
}

function mustRed(label: string, command: string[], cwd: string, env?: Record<string, string>): void {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (result.exitCode === 0) throw new Error(`instrument: ${label} mutation unexpectedly passed`);
  console.log(`instrument: ${label} mutation red as required`);
}

function stage(): void {
  rmSync(join(work, "dist"), { recursive: true, force: true });
  cpSync(join(repo, "dist"), join(work, "dist"), { recursive: true });
  // The figure arms read the manifest as their external expectation; it is staged on every
  // pass so a mutation of the declaration reaches the arms the same way a mutation of the page
  // does.
  cpSync(join(repo, "src/lib/figures.ts"), join(work, "manifest.ts"));
  cpSync(join(repo, "src/lib/vocabulary.ts"), join(work, "vocabulary.ts"));
}

function cssMutation(label: string, needle: string, replacement: string, grep: string): void {
  const path = join(repo, "src/app.css");
  const source = readFileSync(path, "utf8");
  const mutated = source.replace(needle, replacement);
  if (mutated === source) throw new Error(`instrument: ${label} mutation did not match`);
  writeFileSync(path, mutated);
  try {
    run(["bun", "run", "build"], repo);
    stage();
    mustRed(label, ["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", grep], work);
  } finally {
    writeFileSync(path, source);
    run(["bun", "run", "build"], repo);
    stage();
  }
  run(["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", grep], work);
}

function sourceMutation(label: string, path: string, needle: string, replacement: string, grep: string): void {
  const source = readFileSync(path, "utf8");
  const mutated = source.replace(needle, replacement);
  if (mutated === source) throw new Error(`instrument: ${label} mutation did not match`);
  writeFileSync(path, mutated);
  try {
    run(["bun", "run", "build"], repo);
    stage();
    mustRed(label, ["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", grep], work);
  } finally {
    writeFileSync(path, source);
    run(["bun", "run", "build"], repo);
    stage();
  }
  run(["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", grep], work);
}

if (!requireDisplay("instrument")) process.exit(0);

rmSync(join(repo, "dist"), { recursive: true, force: true });
run(["bun", "run", "build"], repo);
mkdirSync(work, { recursive: true });
for (const file of readdirSync(work)) if (file.endsWith(".spec.ts")) rmSync(join(work, file));
for (const file of ["instrument.spec.ts", "figures.spec.ts", "capture.spec.ts", "variance.ts", "reduced.ts", "png.ts", "playwright.config.ts"]) {
  cpSync(join(import.meta.dir, file), join(work, file));
}
writeFileSync(join(work, "package.json"), JSON.stringify({ name: "agentic-engineering-instrument", private: true, dependencies: { "@playwright/test": playwrightVersion } }));
cpSync(join(import.meta.dir, "capture.spec.ts-snapshots"), join(work, "capture.spec.ts-snapshots"), { recursive: true });
stage();
run(["bun", "install", "--silent"], work);
run(["bunx", "playwright", "install", "chromium"], work);
run(["bunx", "playwright", "test", "--config", "playwright.config.ts", "instrument.spec.ts"], work);

const figureSpec = join(work, "figures.spec.ts");
const figureSource = readFileSync(figureSpec, "utf8");
writeFileSync(figureSpec, figureSource.replace("res.writeHead(404", "res.writeHead(200"));
try {
  mustRed("missing-asset server", ["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", "missing assets"], work);
} finally {
  writeFileSync(figureSpec, figureSource);
}

cssMutation("neutral hierarchy", "--heading-font-size: 20px", "--heading-font-size: 15px", "neutral hierarchy");
cssMutation("readable measure", "--measure: 548px", "--measure: 700px", "readable long-form band");
cssMutation("strong emphasis", "--emphasis-font-weight: 600", "--emphasis-font-weight: 400", "production strong emphasis");
sourceMutation(
  "story non-interference",
  join(repo, "src/App.svelte"),
  "Agentic engineering is directing agents to make software.",
  "Changed article text is directing agents to make software.",
  "non-interference",
);

// The measure arm's witness breaches the production measure constant, not the spec's sweep
// width: at 700px the rendered longest line leaves the readable band and the arm reds, which is
// the property the arm exists to hold. The old witness mutated readMaximum(548) to 549 and, once
// the prose-content-dependent tightness half was deleted, reddened nothing.
cssMutation("selected desktop measure", "--measure: 548px", "--measure: 700px", "shipped desktop measure");

// H1 overture arms: register and label policy are partitioned from explanatory figures.
sourceMutation(
  "overture mount and placement",
  join(repo, "src/App.svelte"),
  "\n  <Overture />\n",
  "\n",
  "exactly one unlabeled overture",
);
sourceMutation(
  "overture zero-label policy",
  join(repo, "src/lib/Overture.svelte"),
  'aria-hidden="true">\n  <div class="skin human"',
  'aria-hidden="true">\n  <div data-figure-label>forbidden</div>\n  <div class="skin human"',
  "exactly one unlabeled overture",
);
sourceMutation(
  "overture mobile cell minimum",
  join(repo, "src/lib/Overture.svelte"),
  "@media (max-width: 560px) {\n    .overture {",
  "@media (max-width: 560px) {\n    pre { width: 112px; }\n    .overture {",
  "captured cells keep the H0 minimum width",
);
sourceMutation(
  "overture no area fill",
  join(repo, "src/lib/Overture.svelte"),
  "svg path { fill: none;",
  "svg path { fill: currentColor;",
  "geometry uses strokes without area fill or tint",
);

// S3 figure arms. Each mutation below reaches the assertion the arm is named for: the
// discriminating red, not a missing subject or a preempting error.
sourceMutation(
  "figure count against the manifest",
  join(repo, "src/App.svelte"),
  "\n    <StageLoop />\n",
  "\n",
  "declared site",
);
sourceMutation(
  "figure claim against its lead-in paragraph",
  join(repo, "src/lib/figures.ts"),
  'claim: "Then repeat: implement a stage, verify it, implement the next, until the spec is done."',
  'claim: "Then repeat: implement a task, validate it, implement the next, until the work is done."',
  "quoted claim",
);
sourceMutation(
  "figcaption absence",
  join(repo, "src/lib/Figure.svelte"),
  "{@render children({ elapsed, reduced })}",
  "{@render children({ elapsed, reduced })}\n  <figcaption>a caption</figcaption>",
  "figcaption anywhere",
);
sourceMutation(
  "no figure above the opening section",
  join(repo, "src/App.svelte"),
  '<h1 class="title">agentic engineering</h1>',
  '<h1 class="title">agentic engineering</h1>\n    <StageLoop />',
  "figcaption anywhere",
);
sourceMutation(
  "ordered geometry in the stage loop",
  join(repo, "src/lib/StageLoop.svelte"),
  "{ role: concepts.spec.color, label: concepts.spec.label, x: 14, step: 0 },",
  "{ role: concepts.spec.color, label: concepts.spec.label, x: 300, step: 0 },",
  "order the prose states",
);
sourceMutation(
  "return edge lands on the stage node",
  join(repo, "src/lib/StageLoop.svelte"),
  'data-figure-part="return-edge"\n        d="M 460 {top + height} L 460 100 L 274 100 L 274 {top + height}"',
  'data-figure-part="return-edge"\n        d="M 460 {top + height} L 460 100 L 88 100 L 88 {top + height}"',
  "lands on the stage node",
);
sourceMutation(
  "figure label against its claim",
  join(repo, "src/lib/vocabulary.ts"),
  'verify: { label: "verify", color: "verify"',
  'verify: { label: "validate", color: "verify"',
  "substring of its claim",
);

// V1 connector, easing, and rest mutations each restore the rejected mechanism directly.
sourceMutation(
  "loop connector endpoints",
  join(repo, "src/lib/StageLoop.svelte"),
  'x2="200" y2={top + height / 2}',
  'x2="192" y2={top + height / 2}',
  "every loop connector meets",
);
sourceMutation(
  "loop eased approach",
  join(repo, "src/lib/StageLoop.svelte"),
  "offset-distance: calc((var(--phase, 1) - sin(var(--phase, 1) * 1080deg) * 0.018) * 100%);",
  "offset-distance: calc(var(--phase, 1) * 100%);",
  "non-constant speed",
);
sourceMutation(
  "loop indicator absent at rest",
  join(repo, "src/lib/StageLoop.svelte"),
  `r: calc(7px * max(
      clamp(0, calc(1 - var(--phase, 1) * 18), 1),
      clamp(0, calc(1 - abs(var(--phase, 1) - 0.2784) * 32), 1),
      clamp(0, calc(1 - abs(var(--phase, 1) - 0.5569) * 32), 1),
      clamp(0, calc(1 - abs(var(--phase, 1) - 0.84) * 12), 1)
    ));`,
  "r: 7px;",
  "reduced-motion rest",
);

// H2 motion arms. Each mutation removes one of the loop's three independent channels; all three
// target the real-page "one unit travels" arm, so a source replacement cannot pass on fixture-only coverage.
sourceMutation(
  "loop traveling unit",
  join(repo, "src/lib/StageLoop.svelte"),
  "offset-distance: calc((var(--phase, 1) - sin(var(--phase, 1) * 1080deg) * 0.018) * 100%);",
  "offset-distance: 100%;",
  "one unit travels",
);
sourceMutation(
  "loop occupied-node emphasis",
  join(repo, "src/lib/StageLoop.svelte"),
  "opacity: clamp(0, calc(1 - abs(var(--phase, 1) - 0.5569) * 12), 1);",
  "opacity: 0;",
  "one unit travels",
);
sourceMutation(
  "loop return dash offset",
  join(repo, "src/lib/StageLoop.svelte"),
  "stroke-dashoffset: clamp(0px, calc((1 - var(--phase, 1)) * 225.7px), 100px);",
  "stroke-dashoffset: 0;",
  "one unit travels",
);
// The discriminating mutation here is the reduced-motion read itself, not the effect's early
// return: with `reduced` still true the clock is bypassed anyway, so deleting the return alone
// changes nothing observable and survived the first run of this witness.
sourceMutation(
  "reduced-motion rest",
  join(repo, "src/lib/Figure.svelte"),
  'const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;',
  "const reduced = false;",
  "reduced-motion rest",
);
sourceMutation(
  "role bound in a prose span",
  join(repo, "src/App.svelte"),
  '<span class="term" data-role="prose">human code</span>',
  "human code",
  "bound to both",
);
sourceMutation(
  "role bound in a figure part",
  join(repo, "src/lib/vocabulary.ts"),
  'spec: { label: "spec", color: "context", ...shape }',
  'spec: { label: "spec", color: "agentic", ...shape }',
  "bound to both",
);
if (process.platform === "darwin") {
  const css = readdirSync(join(work, "dist", "assets")).find((file) => file.endsWith(".css"));
  if (!css) throw new Error("instrument: golden mutation has no stylesheet");
  const path = join(work, "dist", "assets", css);
  const source = readFileSync(path, "utf8");
  writeFileSync(path, source.replace("548px", "549px"));
  try {
    mustRed("golden screenshot pixels", ["bunx", "playwright", "test", "--config", "playwright.config.ts", "capture.spec.ts", "--grep", "capture desktop.png"], work);
  } finally {
    writeFileSync(path, source);
  }
}

console.log("instrument: self-test and mutation witnesses passed");
