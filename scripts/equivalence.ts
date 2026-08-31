// Self-terminating pre/post perceptual-differential gate (validation gate 4). With no
// path arguments it builds the frozen baseline ref and the current candidate, then compares
// both inside one Playwright invocation. Explicit --pre/--post roots exist for instrument
// mutation runs; both are required together.

import { cpSync, existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { requireDisplay } from "./display";

const repo = join(import.meta.dir, "..");
const baselineRef = "fe0a1c2";
const args = process.argv.slice(2);

function take(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function run(command: string[], cwd: string): void {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`'${command.join(" ")}' failed (exit ${result.exitCode})`);
  }
}

function requireDist(label: string, root: string): void {
  if (!existsSync(join(root, "index.html"))) {
    throw new Error(`${label} dist has no index.html: ${root}`);
  }
}

if (!requireDisplay("equivalence")) process.exit(0);

const requestedPre = take("--pre");
const requestedPost = take("--post");
if (!!requestedPre !== !!requestedPost) {
  console.error("equivalence: --pre and --post must be supplied together");
  process.exit(1);
}

const work = join(tmpdir(), `agentic-engineering-equivalence-${process.pid}`);
const harness = join(work, "harness");
let exitCode = 1;

try {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(harness, { recursive: true });

  let pre: string;
  let post: string;
  if (requestedPre && requestedPost) {
    pre = resolve(requestedPre);
    post = resolve(requestedPost);
  } else {
    const baseline = join(work, "baseline");
    const archive = join(work, "baseline.tar");
    mkdirSync(baseline, { recursive: true });
    console.log(`equivalence: building baseline ${baselineRef}…`);
    run(["git", "archive", "--format=tar", `--output=${archive}`, baselineRef], repo);
    run(["tar", "-xf", archive, "-C", baseline], work);
    run(["bun", "install", "--silent"], baseline);
    run(["bun", "run", "build"], baseline);

    console.log("equivalence: building candidate…");
    run(["bun", "run", "build"], repo);
    pre = join(baseline, "dist");
    post = join(repo, "dist");
  }

  requireDist("baseline", pre);
  requireDist("candidate", post);
  if (realpathSync(pre) === realpathSync(post)) {
    throw new Error(`baseline and candidate resolve to the same root: ${realpathSync(pre)}`);
  }

  for (const file of [
    "equivalence.spec.ts",
    "png.ts",
    "reduced.ts",
    "variance.ts",
    "playwright.config.ts",
  ]) {
    cpSync(join(import.meta.dir, file), join(harness, file));
  }
  writeFileSync(
    join(harness, "package.json"),
    JSON.stringify({
      name: "agentic-engineering-equivalence",
      private: true,
      dependencies: { "@playwright/test": "^1.50.0" },
    }),
  );
  run(["bun", "install", "--silent"], harness);
  run(["bunx", "playwright", "install", "chromium"], harness);

  const result = Bun.spawnSync(
    ["bunx", "playwright", "test", "--config", "playwright.config.ts"],
    {
      cwd: harness,
      env: { ...process.env, EQ_PRE: pre, EQ_POST: post },
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  exitCode = result.exitCode ?? 1;
} catch (error) {
  console.error(`equivalence: ${(error as Error).message}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

process.exit(exitCode);
