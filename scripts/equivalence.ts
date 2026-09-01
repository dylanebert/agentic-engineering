// Self-terminating pre/post perceptual-differential gate (validation gate 4). It compares
// explicit --pre/--post roots inside one Playwright invocation. The old no-argument baseline
// mode is retired; explicit roots keep instrument mutation runs independent of a moving ref.

import { cpSync, existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { requireDisplay } from "./display";
import { playwrightVersion } from "./playwright-version";

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

const requestedPre = take("--pre");
const requestedPost = take("--post");
if (!requestedPre && !requestedPost) {
  console.error("equivalence: explicit --pre and --post roots are required");
  process.exit(1);
}
if (!!requestedPre !== !!requestedPost) {
  console.error("equivalence: --pre and --post must be supplied together");
  process.exit(1);
}
if (!requireDisplay("equivalence")) process.exit(0);

const work = join(tmpdir(), `agentic-engineering-equivalence-${process.pid}`);
const harness = join(work, "harness");
let exitCode = 1;

try {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(harness, { recursive: true });

  const pre = resolve(requestedPre!);
  const post = resolve(requestedPost!);
  requireDist("baseline", pre);
  requireDist("candidate", post);
  if (realpathSync(pre) === realpathSync(post)) {
    throw new Error(`baseline and candidate resolve to the same root: ${realpathSync(pre)}`);
  }

  for (const file of [
    "equivalence.spec.ts",
    "playwright-version.ts",
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
      dependencies: { "@playwright/test": playwrightVersion },
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
