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
// committed typography, measure, selection, source-shape, server, font, and golden mutation
// witnesses against the built page. Display-gated.

const repo = join(import.meta.dir, "..");
const documentedExclusions = new Set(["--heading-bg", "--heading-text-transform"]);
const pinnedHeadingChrome = new Map([
  [":root", "transparent"],
  ["html.vibe", "transparent"],
  ["html.win98", "#000080"],
]);

function declarations(source: string): Map<string, string> {
  const result = new Map<string, string>();
  const pattern = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gm;
  for (const match of source.matchAll(pattern)) result.set(match[1]!, match[2]!.trim());
  return result;
}

function selectorBlock(source: string, selector: string): string {
  const blockStart = source.indexOf(`${selector} {`);
  if (blockStart < 0) throw new Error(`template source shape: missing ${selector} block`);
  const open = source.indexOf("{", blockStart);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  throw new Error(`template source shape: unterminated ${selector} block`);
}

function blockRegion(source: string, selector: string, marker: string): string {
  const block = selectorBlock(source, selector);
  const regionStart = block.indexOf(marker);
  const regionEnd = block.indexOf("/* end template region */", regionStart);
  if (regionStart < 0 || regionEnd < 0) throw new Error(`template source shape: missing ${selector} template region`);
  return block.slice(regionStart + marker.length, regionEnd);
}

function exclusionRegion(source: string, selector: string): Map<string, string> {
  const blockStart = source.indexOf(`${selector} {`);
  const regionEnd = source.indexOf("/* end template region */", blockStart);
  const exclusionStart = source.indexOf("/* Pinned boundary: heading chrome and text-transform are exact documented exclusions. */", regionEnd);
  const sectionBackground = source.indexOf("/* Section background", exclusionStart);
  const blockEnd = source.indexOf("\n}", exclusionStart);
  const exclusionEnd = sectionBackground >= 0 && sectionBackground < blockEnd ? sectionBackground : blockEnd;
  if (blockStart < 0 || regionEnd < 0 || exclusionStart < 0 || exclusionEnd < 0) {
    throw new Error(`template source shape: missing ${selector} exclusion region`);
  }
  return declarations(source.slice(exclusionStart, exclusionEnd));
}

function assertTemplateSourceShape(source: string): void {
  const selectors = [":root", "html.vibe", "html.win98"];
  const blocks = selectors.map((selector) => declarations(blockRegion(source, selector, "/* template region */")));
  // Resolve one-hop aliases in the neutral :root block only. A dress may reuse an alias name for
  // its own value; a whole-file last-wins map would let that later declaration hide arithmetic in
  // the neutral template and make the source-shape arm order-dependent.
  const neutralTokensInRoot = declarations(selectorBlock(source, ":root"));
  const neutralTokens = new Set(blocks[0]!.keys());
  if (neutralTokens.size === 0) throw new Error("template source shape: neutral template region is empty");
  for (const [index, block] of blocks.entries()) {
    if (block.size !== neutralTokens.size || [...neutralTokens].some((token) => !block.has(token))) {
      throw new Error(`template source shape: block ${index} does not exactly match the neutral token set`);
    }
  }
  for (const token of neutralTokens) {
    const value = blocks[0]!.get(token)!;
    const alias = value.match(/var\(\s*(--[a-z0-9-]+)\s*\)/)?.[1];
    const resolved = alias ? neutralTokensInRoot.get(alias) ?? "" : "";
    if (/(?:calc|clamp|color-mix|--(?:snap|t1|t2))/.test(value) ||
        /(?:calc|clamp|color-mix|--(?:snap|t1|t2))/.test(resolved)) {
      throw new Error(`template source shape: neutral ${token} contains snap/interpolation arithmetic`);
    }
  }
  for (const token of ["--heading-color", "--emphasis-color"]) {
    if (neutralTokens.has(token)) {
      throw new Error(`template source shape: ${token} must remain outside the copyable template region`);
    }
  }
  for (const selector of selectors) {
    const actual = exclusionRegion(source, selector);
    if (actual.size !== documentedExclusions.size || [...documentedExclusions].some((token) => !actual.has(token))) {
      throw new Error(`template source shape: ${selector} exclusions changed`);
    }
    if (actual.get("--heading-bg") !== pinnedHeadingChrome.get(selector)) {
      throw new Error(`template source shape: ${selector} heading chrome is not pinned literal`);
    }
  }
}

if (process.argv.includes("--source-shape-only")) {
  assertTemplateSourceShape(readFileSync(join(repo, "src/app.css"), "utf8"));
  console.log("instrument: source-shape arm passed");
  process.exit(0);
}

if (!requireDisplay("instrument")) process.exit(0);

function run(cmd: string[], cwd: string): void {
  const result = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (result.exitCode !== 0) {
    throw new Error(`instrument: '${cmd.join(" ")}' failed (exit ${result.exitCode})`);
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
    throw new Error(`instrument: ${label} mutation unexpectedly passed`);
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
    throw new Error(`instrument: ${label} did not reject with its guard message: ${stderr}`);
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
  try {
    commandMustRed(label, cmd, cwd);
  } finally {
    writeFileSync(path, source);
  }
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
  try {
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
  } finally {
    writeFileSync(reduced, source);
  }
}

function sourceShapeMutationMustRed(label: string, mutated: string): void {
  const path = join(repo, "src/app.css");
  const source = readFileSync(path, "utf8");
  if (mutated === source) throw new Error(`instrument: ${label} mutation did not match its source`);
  writeFileSync(path, mutated);
  try {
    commandMustRed(
      label,
      ["bun", "run", "scripts/instrument.ts", "--source-shape-only"],
      repo,
    );
  } finally {
    writeFileSync(path, source);
    run(["bun", "run", "scripts/instrument.ts", "--source-shape-only"], repo);
  }
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
  "oracle-text.spec.ts",
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
  "template indirect measure arithmetic",
  cssSource
    .replace("  --measure: 548px;", "  --measure: var(--portable-measure);")
    .replace(
      "  /* end template region */\n  /* Scoped consumers: body",
      "  /* end template region */\n  --portable-measure: calc(548px + 0px);\n  /* Scoped consumers: body",
    ),
);
sourceShapeMutationMustRed(
  "template indirect arithmetic survives a shadowed alias",
  cssSource
    .replace(
      "  --measure: 548px;",
      "  --measure: var(--portable-measure);",
    )
    .replace(
      "  /* end template region */\n  /* Scoped consumers: body",
      "  /* end template region */\n  --portable-measure: calc(548px + 0px);\n  /* Scoped consumers: body",
    )
    .replace(
      "  /* end template region */\n  /* Scoped consumers: this dress overrides body",
      "  /* end template region */\n  --portable-measure: 548px;\n  /* Scoped consumers: this dress overrides body",
    ),
);
sourceShapeMutationMustRed(
  "template vibe rhythm token",
  cssSource.replace("  --section-padding: 12px;\n  --section-margin-top: 36px;\n  --paragraph-margin-top: 12px;", "  --section-padding: 12px;\n  --section-margin-top: 36px;"),
);
sourceShapeMutationMustRed(
  "template color alias boundary",
  cssSource.replace("  --heading-font-weight: 600;", "  --heading-font-weight: 600;\n  --heading-color: var(--ink);"),
);
sourceShapeMutationMustRed(
  "template win98 rhythm token",
  cssSource.replace("  --section-padding: 8px;\n  --section-margin-top: 36px;\n  --paragraph-margin-top: 12px;", "  --section-padding: 8px;\n  --paragraph-margin-top: 12px;"),
);
sourceShapeMutationMustRed(
  "template documented exclusion",
  cssSource.replace("  --heading-bg: #000080;\n  --heading-text-transform: capitalize;", "  --heading-text-transform: capitalize;"),
);
sourceShapeMutationMustRed(
  "template heading chrome literal",
  cssSource.replace("  --heading-bg: transparent;\n  --heading-text-transform: lowercase;", "  --heading-bg: color-mix(in srgb, #000080 0%, transparent);\n  --heading-text-transform: lowercase;"),
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
  try {
    run(["bun", "run", "build"], repo);
    refreshStagedDist();
    commandMustRed(
      label,
      ["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", grep],
      work,
    );
  } finally {
    writeFileSync(path, source);
    run(["bun", "run", "build"], repo);
    refreshStagedDist();
    run(
      ["bunx", "playwright", "test", "--config", "playwright.config.ts", "figures.spec.ts", "--grep", grep],
      work,
    );
  }
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
cssMutationMustRed(
  "portable readable measure",
  "  --measure: 548px;",
  "  --measure: 700px;",
  "typography: neutral measure stays in the readable long-form band",
);
cssMutationMustRed(
  "neutral secondary display weight",
  "  --display-font-weight: 500;",
  "  --display-font-weight: 400;",
  "secondary display weight",
);
cssMutationMustRed(
  "vibe secondary display weight",
  "  --display-font-weight: 400;\n  --heading-padding: 0px;",
  "  --display-font-weight: 500;\n  --heading-padding: 0px;",
  "secondary display weight",
);
cssMutationMustRed(
  "win98 secondary display weight",
  "  --display-font-weight: 400;\n  --heading-padding: 2px 4px;",
  "  --display-font-weight: 500;\n  --heading-padding: 2px 4px;",
  "secondary display weight",
);

const captureSource = readFileSync(join(work, "capture.spec.ts"), "utf8");
sourceMutationMustRedAndRestore(
  "capture missing-asset 404",
  join(work, "capture.spec.ts"),
  captureSource.replace(
    "      res.writeHead(404, { \"content-type\": \"text/plain; charset=utf-8\" });\n      res.end(`missing asset: ${path}`);\n      return;",
    "      path = \"index.html\";\n      body = await readFile(join(dist, path));",
  ),
  [
    "bunx",
    "playwright",
    "test",
    "--config",
    "playwright.config.ts",
    "capture.spec.ts",
    "--grep",
    "capture missing assets",
  ],
  work,
);
const oracleTextSource = readFileSync(join(work, "oracle-text.spec.ts"), "utf8");
sourceMutationMustRedAndRestore(
  "text-oracle missing-asset 404",
  join(work, "oracle-text.spec.ts"),
  oracleTextSource.replace(
    "      res.writeHead(404, { \"content-type\": \"text/plain; charset=utf-8\" });\n      res.end(`missing asset: ${path}`);\n      return;",
    "      path = \"index.html\";\n      body = await readFile(join(dist, path));",
  ),
  [
    "bunx",
    "playwright",
    "test",
    "--config",
    "playwright.config.ts",
    "oracle-text.spec.ts",
    "--grep",
    "text oracle missing assets",
  ],
  work,
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
