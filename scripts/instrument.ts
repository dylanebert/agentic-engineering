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
  'claim: "A whole space sits between them, and agentic engineering lives there"',
  'claim: "A whole space sits between them, and vibe coding lives there"',
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
  '<h1 class="title">agentic engineering</h1>\n    <SpectrumAxis />',
  "figcaption anywhere",
);
sourceMutation(
  "ordered geometry on the spectrum axis",
  join(repo, "src/lib/SpectrumAxis.svelte"),
  'x: 74, anchor: "middle" },\n    { role: "agentic", label: concepts.agentic.label, x: 274',
  'x: 274, anchor: "middle" },\n    { role: "agentic", label: concepts.agentic.label, x: 74',
  "order the prose states",
);
sourceMutation(
  "figure label against its section's prose",
  join(repo, "src/lib/vocabulary.ts"),
  'verify: { label: "verify", color: "verify"',
  'verify: { label: "validate", color: "verify"',
  "substring of its section",
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
