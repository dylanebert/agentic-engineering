// Contact-sheet runner (spec stage S3). Mirrors the figure/shot/instrument runner shape: builds
// the repo, stages a disposable work dir (dist + the contact spec + its config), serves the
// built page through the spec's own origin, runs the admissibility arms green, publishes the
// composed sheet and per-candidate captures into scratch/, then mutation-proves every arm
// (each mutation must flip its arm red — a green run under mutation is a failed gate).
//
// Self-terminating: the Playwright run owns the origin, nothing listens after the process
// exits, and the work dir is rebuilt (swept) on every run.
//
// Output: scratch/agentic-engineering-post-template/round1/ — contact-sheet.png (the four
// candidate rows under identical conditions), plus baseline/candidate fixed-crop captures for
// the S4 stage. scratch/ is gitignored; the artifact precedes the selection question, which
// parks with the human.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDisplay } from "./display";

const repo = join(import.meta.dir, "..");
const repoName = "agentic-engineering";
const scratchDir =
  process.env.CONTACT_SCRATCH ?? join(repo, "..", "..", "..", "scratch", repoName);
const workDir = join(tmpdir(), `${repoName}-contact`);
const outDir = join(scratchDir, "round1");

if (!requireDisplay("contact")) {
  console.log("contact: display unavailable, skipping (set KEX_ALLOW_SKIP=1 to force)");
  process.exit(0);
}

function run(cmd: string[], cwd: string): { ok: boolean; code: number } {
  console.log(`contact: ${cmd.join(" ")} (cwd=${cwd})`);
  const proc = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  return { ok: proc.exitCode === 0, code: proc.exitCode ?? -1 };
}

function must(cmd: string[], cwd: string): void {
  const r = run(cmd, cwd);
  if (!r.ok) {
    console.error(`contact: command failed (exit ${r.code}): ${cmd.join(" ")}`);
    process.exit(r.code || 1);
  }
}

const pkg = JSON.stringify(
  { name: "agenticengineering-contact", private: true, dependencies: { "@playwright/test": "^1.50.0" } },
  null,
  2,
);

// Original bytes per staged file, captured at stage time — mutations restore wholesale so no
// replace-back can ever collide with itself (two candidates share token blocks).
const pristine = new Map<string, string>();

function stage(file: string): void {
  cpSync(join(repo, "scripts", file), join(workDir, file));
  pristine.set(file, readFileSync(join(workDir, file), "utf8"));
}

function prepWork(): string {
  if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  mkdirSync(join(workDir, "dist"), { recursive: true });
  cpSync(join(repo, "dist"), join(workDir, "dist"), { recursive: true });
  // Only the files the contact spec needs.
  for (const f of ["contact.spec.ts", "candidates.ts", "png.ts", "contact.playwright.config.ts"]) {
    stage(f);
  }
  // Minimal package manifest without "type": "module" — the staged spec then transpiles to
  // CJS and its __dirname references resolve (same contract figures.ts stages).
  writeFileSync(join(workDir, "package.json"), pkg);
  const stray = readdirSync(workDir).filter((f) => f.endsWith(".spec.ts") && f !== "contact.spec.ts");
  for (const f of stray) rmSync(join(workDir, f));
  return workDir;
}

// --- Mutation witnesses -------------------------------------------------------------
// Each arm's docblock names its mutation; the witness proves the arm actually reds under it.
// All mutations hit the staged copies only — the repo tree is untouched.

interface Mutation {
  label: string;
  grep: string;
  file: string;
  from: string;
  to: string;
  observedExit?: number;
}

const mutations: Mutation[] = [
  {
    // candidate identity arm
    label: "identity: candidate A renders weight 500 while recorded 400",
    grep: "candidate identity",
    file: "candidates.ts",
    from: "/* MUT1 */",
    to: ":root { --body-font-weight: 500; }",
  },
  {
    // intended-channel variance arm
    label: "variance: candidate B's rule set replaced by candidate A's (pair renders identically)",
    grep: "pairs vary",
    file: "candidates.ts",
    from: "/* MUT2 */",
    to: [
      ":root {",
      "  --body-font-weight: 400;",
      "  --body-line-height: 1.6;",
      "  --heading-font-size: 19px;",
      "  --heading-font-weight: 600;",
      "  --heading-color: var(--ink);",
      "  --heading-margin-bottom: 14px;",
      "  --measure: 620px;",
      "}",
      ".page .section { margin-top: 56px; }",
      ".page .section p { margin-top: 14px; }",
    ].join("\n"),
  },
  {
    // rendered-text arm
    label: "text: candidate C uppercases its h2 rendered text",
    grep: "rendered text",
    file: "candidates.ts",
    from: "/* MUT3 */",
    to: ".page .section h2 { text-transform: uppercase; }",
  },
  {
    // visualization-state arm
    label: "viz-state: candidate D moves --pos to 1",
    grep: "visualization state",
    file: "candidates.ts",
    from: "/* MUT4 */",
    to: ":root { --pos: 1; }",
  },
  {
    // palette arm
    label: "palette: candidate B recolors body ink to #b026ff",
    grep: "palette channels",
    file: "candidates.ts",
    from: "/* MUT5 */",
    to: "body { color: #b026ff; }",
  },
  {
    // fonts arm
    label: "fonts: extra link stops requesting the 400 face",
    grep: "real faces",
    file: "candidates.ts",
    from: "wght@400;500",
    to: "wght@500",
  },
  {
    // overflow arm
    label: "overflow: candidate D forces a 1600px block into the page",
    grep: "horizontal overflow",
    file: "candidates.ts",
    from: "/* MUT7 */",
    // The block needs real height: a zero-height empty box contributes no scrollable overflow,
    // so width alone never moves documentElement.scrollWidth (measured at the S3 run).
    to: 'body::after { content: ""; display: block; width: 1600px; height: 10px; }',
  },
  {
    // sheet artifact arm
    label: "sheet: compose loop drops the last candidate row",
    grep: "contact sheet written",
    file: "contact.spec.ts",
    from: "const rows = candidates.map((c, i) => {",
    to: "const rows = candidates.slice(0, 3).map((c, i) => {",
  },
];

function applyMutation(m: Mutation): void {
  const path = join(workDir, m.file);
  const source = pristine.get(m.file)!;
  if (!source.includes(m.from)) {
    console.error(`contact: mutation anchor not found for "${m.label}" in ${m.file}: ${m.from}`);
    process.exit(1);
  }
  writeFileSync(path, source.replace(m.from, m.to));
}

function revertMutation(m: Mutation): void {
  writeFileSync(join(workDir, m.file), pristine.get(m.file)!);
}

// --- Main sequence -------------------------------------------------------------------

must(["bun", "run", "build"], repo);
prepWork();
must(["bun", "install", "--silent"], workDir);
must(["bunx", "playwright", "install", "chromium"], workDir);

// Green run: every arm plus the sheet artifact.
const green = run(
  ["bunx", "playwright", "test", "--config", "contact.playwright.config.ts"],
  workDir,
);
if (!green.ok) {
  console.error(`contact: admissibility gate failed (exit ${green.code})`);
  process.exit(green.code || 1);
}

// Publish the artifact + captures. scratch/ is gitignored; this is the only repo-relative
// write the runner makes.
mkdirSync(outDir, { recursive: true });
cpSync(join(workDir, "sheet.png"), join(outDir, "contact-sheet.png"));
for (const key of ["baseline", "a", "b", "c", "d"]) {
  for (const view of ["desktop", "mobile"]) {
    cpSync(join(workDir, `${key}-${view}.png`), join(outDir, `${key}-${view}.png`));
  }
}
console.log(`contact: artifact published to ${outDir}`);

// Mutation witnesses: every arm must red under its recorded mutation.
let failed = 0;
for (const m of mutations) {
  applyMutation(m);
  const r = run(
    ["bunx", "playwright", "test", "--config", "contact.playwright.config.ts", "--grep", m.grep],
    workDir,
  );
  m.observedExit = r.code;
  revertMutation(m);
  if (r.ok) {
    console.error(`contact: MUTATION DID NOT RED — ${m.label}`);
    failed++;
  } else {
    console.log(`contact: mutation witness red (exit ${r.code}) — ${m.label}`);
  }
}
if (failed > 0) {
  console.error(`contact: ${failed} mutation witness(es) failed to discriminate`);
  process.exit(1);
}

console.log("contact: gate passed (green run + all mutation witnesses red)");
