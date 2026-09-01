import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDisplay } from "./display";
import { playwrightVersion } from "./playwright-version";

// Self-terminating instrument self-test. Stages the variance + reduced-motion specs and their
// harness modules into a work dir with @playwright/test, runs playwright, exits. It also runs the
// committed S5 selection and golden mutation witnesses against the built page. Display-gated.

const repo = join(import.meta.dir, "..");
const templateTokens = [
  "--sans",
  "--display",
  "--body-font-size",
  "--body-font-weight",
  "--body-line-height",
  "--title-font-size",
  "--title-font-size-sm",
  "--heading-font-size",
  "--heading-font-weight",
  "--heading-color",
  "--emphasis-font-weight",
  "--emphasis-color",
  "--heading-bg",
  "--heading-padding",
  "--heading-margin-bottom",
  "--heading-text-transform",
  "--heading-letter-spacing",
  "--h2-letter-spacing",
  "--link-decoration-opacity",
  "--measure",
  "--section-padding",
  "--section-margin-top",
  "--paragraph-margin-top",
  "--meta-font-size",
  "--dek-font-size",
  "--label-font-size",
  "--aside-font-size",
] as const;
const headingAsymmetries = new Set(["--heading-bg", "--heading-text-transform"]);

function templateBlock(source: string, selector: string): Map<string, string> {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`template source shape: missing ${selector} block`);
  const end = source.indexOf("\n}", start);
  if (end < 0) throw new Error(`template source shape: unterminated ${selector} block`);
  const declarations = new Map<string, string>();
  const pattern = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm;
  for (const match of source.slice(start, end).matchAll(pattern)) declarations.set(match[1]!, match[2]!.trim());
  return declarations;
}

function assertTemplateSourceShape(source: string): void {
  const blocks = [templateBlock(source, ":root"), templateBlock(source, "html.vibe"), templateBlock(source, "html.win98")];
  for (const [index, block] of blocks.entries()) {
    const actual = new Set(block.keys());
    if (templateTokens.some((token) => !actual.has(token))) {
      throw new Error(`template source shape: block ${index} does not declare the complete token set`);
    }
  }
  for (const token of templateTokens) {
    if (headingAsymmetries.has(token)) continue;
    const value = blocks[0].get(token)!;
    if (/(?:calc|clamp|color-mix|--(?:snap|t1|t2))/.test(value)) {
      throw new Error(`template source shape: neutral ${token} contains snap/interpolation arithmetic`);
    }
  }
}

if (process.env.INSTRUMENT_SOURCE_SHAPE_ONLY === "1") {
  assertTemplateSourceShape(readFileSync(join(repo, "src/app.css"), "utf8"));
  console.log("instrument: source-shape arm passed");
  process.exit(0);
}

if (!requireDisplay("instrument")) process.exit(0);

function run(cmd: string[], cwd: string): void {
  const result = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) {
    console.error(`instrument: '${cmd.join(" ")}' failed (exit ${result.exitCode})`);
    process.exit(1);
  }
}

function commandMustRed(label: string, cmd: string[], cwd: string, env?: Record<string, string>): void {
  const result = Bun.spawnSync(cmd, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    ...(env ? { env: { ...process.env, ...env } } : {}),
  });
  if (result.exitCode === 0) {
    console.error(`instrument: ${label} mutation unexpectedly passed`);
    process.exit(1);
  }
  console.log(`instrument: ${label} mutation red as required`);
}

function commandMustRedWithStderr(
  label: string,
  cmd: string[],
  cwd: string,
  expected: string,
): void {
  const result = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0 || !stderr.includes(expected)) {
    console.error(`instrument: ${label} did not reject with its guard message`);
    console.error(stderr);
    process.exit(1);
  }
  console.log(`instrument: ${label} rejected with its guard message`);
}

function sourceMutationMustRedAndRestore(
  label: string,
  path: string,
  mutated: string,
  cmd: string[],
  cwd: string,
): void {
  const source = readFileSync(path, "utf8");
  if (mutated === source) {
    console.error(`instrument: ${label} mutation did not match its source`);
    process.exit(1);
  }
  run(cmd, cwd);
  writeFileSync(path, mutated);
  commandMustRed(label, cmd, cwd);
  writeFileSync(path, source);
  run(cmd, cwd);
  console.log(`instrument: ${label} mutation restored green`);
}

function reducedMutationMustRed(
  label: string,
  source: string,
  mutated: string,
  grep: string,
): void {
  if (mutated === source) {
    console.error(`instrument: ${label} mutation did not match its source`);
    process.exit(1);
  }

  const reduced = join(work, "reduced.ts");
  writeFileSync(reduced, mutated);
  commandMustRed(
    label,
    [
      "bunx",
      "playwright",
      "test",
      "--config",
      "playwright.config.ts",
      "instrument.spec.ts",
      "--grep",
      grep,
    ],
    work,
  );
  writeFileSync(reduced, source);
}

function sourceShapeMutationMustRed(label: string, mutated: string): void {
  const path = join(repo, "src/app.css");
  const source = readFileSync(path, "utf8");
  if (mutated === source) throw new Error(`instrument: ${label} mutation did not match its source`);
  writeFileSync(path, mutated);
  commandMustRed(
    label,
    ["bun", "run", "scripts/instrument.ts"],
    repo,
    { INSTRUMENT_SOURCE_SHAPE_ONLY: "1" },
  );
  writeFileSync(path, source);
  console.log(`instrument: ${label} mutation restored green`);
}

assertTemplateSourceShape(readFileSync(join(repo, "src/app.css"), "utf8"));

const pkg = JSON.stringify(
  {
    name: "agentic-engineering-instrument",
    private: true,
    dependencies: { "@playwright/test": playwrightVersion },
  },
  null,
  2,
);

console.log("instrument: building…");
rmSync(join(repo, "dist"), { recursive: true, force: true });
run(["bun", "run", "build"], repo);

const work = join(tmpdir(), "agentic-engineering-instrument");
mkdirSync(work, { recursive: true });

// The work dir is reused across runs; sweep stray .spec.ts files a debugging session could
// have staged there before copying the committed set (same hazard as figures.ts's prepWork).
for (const file of readdirSync(work)) {
  if (file.endsWith(".spec.ts")) rmSync(join(work, file), { force: true });
}

for (const file of [
  "display.ts",
  "equivalence.spec.ts",
  "equivalence.ts",
  "playwright-version.ts",
  "instrument.spec.ts",
  "figures.spec.ts",
  "capture.spec.ts",
  "variance.ts",
  "reduced.ts",
  "png.ts",
  "playwright.config.ts",
]) {
  cpSync(join(import.meta.dir, file), join(work, file));
}
writeFileSync(join(work, "package.json"), pkg);
cpSync(join(repo, "bun.lock"), join(work, "bun.lock"));
cpSync(join(import.meta.dir, "capture.spec.ts-snapshots"), join(work, "capture.spec.ts-snapshots"), {
  recursive: true,
});
rmSync(join(work, "dist"), { recursive: true, force: true });
cpSync(join(repo, "dist"), join(work, "dist"), { recursive: true });

console.log("instrument: running self-test…");
run(["bun", "install", "--silent"], work);
run(["bunx", "playwright", "install", "chromium"], work);
run(["bunx", "playwright", "test", "--config", "playwright.config.ts", "instrument.spec.ts"], work);

const cssSource = readFileSync(join(repo, "src/app.css"), "utf8");
sourceShapeMutationMustRed(
  "template measure arithmetic",
  cssSource.replace("--measure: 548px;", "--measure: calc(548px + 0px);"),
);
sourceShapeMutationMustRed(
  "template vibe rhythm token",
  cssSource.replace("  --section-padding: 12px;\n  --section-margin-top: 36px;\n  --paragraph-margin-top: 12px;", "  --section-padding: 12px;\n  --section-margin-top: 36px;"),
);
sourceShapeMutationMustRed(
  "template win98 rhythm token",
  cssSource.replace("  --section-padding: 8px;\n  --section-margin-top: 36px;\n  --paragraph-margin-top: 12px;", "  --section-padding: 8px;\n  --paragraph-margin-top: 12px;"),
);

function refreshStagedDist(): void {
  rmSync(join(work, "dist"), { recursive: true, force: true });
  cpSync(join(repo, "dist"), join(work, "dist"), { recursive: true });
}

function cssMutationMustRed(label: string, needle: string, replacement: string, grep: string): void {
  const path = join(repo, "src/app.css");
  const source = readFileSync(path, "utf8");
  const mutated = source.replace(needle, replacement);
  if (mutated === source) throw new Error(`instrument: ${label} mutation did not match its source`);
  writeFileSync(path, mutated);
  run(["bun", "run", "build"], repo);
  refreshStagedDist();
  commandMustRed(
    label,
    ["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", grep],
    work,
  );
  writeFileSync(path, source);
  run(["bun", "run", "build"], repo);
  refreshStagedDist();
  console.log(`instrument: ${label} mutation restored green`);
}

cssMutationMustRed(
  "heading/body ordering",
  "  --heading-font-size: 20px;",
  "  --heading-font-size: 15px;",
  "typography: neutral hierarchy",
);
cssMutationMustRed(
  "emphasis weight",
  "  --emphasis-font-weight: 600;",
  "  --emphasis-font-weight: 400;",
  "typography: production strong emphasis",
);
cssMutationMustRed(
  "section rhythm",
  "  --section-margin-top: 52px;",
  "  --section-margin-top: 14px;",
  "typography: production strong emphasis",
);

const reduced = join(work, "reduced.ts");
const reducedSource = readFileSync(reduced, "utf8");
reducedMutationMustRed(
  "settle no-op",
  reducedSource,
  reducedSource.replace(
    /export async function settleToRest\([\s\S]*?\n}\n\nasync function activeMotion/,
    `export async function settleToRest(
  _page: Page,
  _selector: string,
  _budget: number = REST_BUDGET,
): Promise<void> {}

async function activeMotion`,
  ),
  "settle: a zero frame-pair budget",
);
reducedMutationMustRed(
  "one stable pair",
  reducedSource,
  reducedSource.replace("if (stablePairs === 2) return;", "if (stablePairs === 1) return;"),
  "settle: does not accept one equal stale pair",
);
reducedMutationMustRed(
  "rest-budget expiry",
  reducedSource,
  reducedSource.replace(
    /  throw new Error\(\n    `never reached rest within \$\{budget} rAF-separated frame pairs — a transition or animation is in flight under reduced-motion`,\n  \);/,
    "  return;",
  ),
  "rAF repaint invisible to getAnimations",
);

const fixtureRoot = join(work, "equivalence-fixtures");
const pre = join(fixtureRoot, "pre");
const post = join(fixtureRoot, "post");
const alias = join(fixtureRoot, "pre-alias");
rmSync(fixtureRoot, { recursive: true, force: true });
mkdirSync(pre, { recursive: true });
mkdirSync(post, { recursive: true });
const prose = "Same-run equivalence instrument fixture text. ".repeat(20);
const html = `<!doctype html><html><head><link rel="stylesheet" href="/agentic-engineering/style.css"></head><body><main class="page"><p>${prose}</p></main></body></html>`;
writeFileSync(join(pre, "index.html"), html);
writeFileSync(join(post, "index.html"), html);
writeFileSync(join(pre, "style.css"), "body{margin:0}.page{box-sizing:border-box;width:600px;padding:24px}");
writeFileSync(join(post, "style.css"), "body{margin:0}.page{box-sizing:border-box;width:601px;padding:24px}");
symlinkSync(pre, alias);

commandMustRed(
  "identical resolved roots",
  ["bun", "run", "equivalence.ts", "--pre", pre, "--post", alias],
  work,
);
commandMustRed(
  "1px layout",
  ["bun", "run", "equivalence.ts", "--pre", pre, "--post", post],
  work,
);
commandMustRedWithStderr(
  "retired no-argument equivalence mode",
  ["bun", "run", "equivalence.ts"],
  work,
  "equivalence: explicit --pre and --post roots are required",
);
rmSync(fixtureRoot, { recursive: true, force: true });

const selectedMeasure = join(work, "figures.spec.ts");
sourceMutationMustRedAndRestore(
  "S5 selected measure",
  selectedMeasure,
  readFileSync(selectedMeasure, "utf8").replace(
    "const selected = readMaximum(548);",
    "const selected = readMaximum(549);",
  ),
  [
    "bunx",
    "playwright",
    "test",
    "--config",
    "playwright.config.ts",
    "figures.spec.ts",
    "--grep",
    "selected desktop measure",
  ],
  work,
);

if (process.platform === "darwin") {
  const css = readdirSync(join(work, "dist", "assets")).find((file) => file.endsWith(".css"));
  if (!css) {
    console.error("instrument: golden screenshot mutation has no built stylesheet");
    process.exit(1);
  }
  const stylesheet = join(work, "dist", "assets", css);
  sourceMutationMustRedAndRestore(
    "golden screenshot pixels",
    stylesheet,
    readFileSync(stylesheet, "utf8").replace("548px", "549px"),
    [
      "bunx",
      "playwright",
      "test",
      "--config",
      "playwright.config.ts",
      "capture.spec.ts",
      "--grep",
      "capture desktop.png",
    ],
    work,
  );
} else {
  console.log(
    `instrument: golden screenshot pixel mutation skipped on ${process.platform}; stamped seat is darwin`,
  );
}

console.log("instrument: self-test and mutation witnesses passed");
