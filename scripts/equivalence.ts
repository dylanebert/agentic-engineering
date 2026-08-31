// Self-terminating pre/post pixel-differential harness (gate 4). Builds nothing itself: the
// caller passes two already-built dist directories (--pre, --post) and this stages the
// equivalence spec plus the instrument's own PNG decoder into a work dir, then runs playwright
// once. Both dists are served and screenshotted inside that single playwright invocation, so
// environment variance cancels; the spec compares full-page screenshots pairwise at the five
// sampled morph positions and reds on any pixel the refactor moved.
//
// Usage: bun scripts/equivalence.ts --pre <distDir> --post <distDir>

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function take(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}
const pre = take("--pre") ? resolve(take("--pre")!) : undefined;
const post = take("--post") ? resolve(take("--post")!) : undefined;
if (!pre || !post) {
  console.error("equivalence: --pre <distDir> --post <distDir> are required");
  process.exit(1);
}

const work = join(tmpdir(), `agentic-engineering-equivalence-${process.pid}`);
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
cpSync(join(import.meta.dir, "equivalence.spec.ts"), join(work, "equivalence.spec.ts"));
cpSync(join(import.meta.dir, "png.ts"), join(work, "png.ts"));
cpSync(join(import.meta.dir, "playwright.config.ts"), join(work, "playwright.config.ts"));

writeFileSync(
  join(work, "package.json"),
  JSON.stringify({
    name: "agentic-engineering-equivalence",
    private: true,
    dependencies: { "@playwright/test": "^1.50.0" },
  }),
);
const install = Bun.spawnSync(["bun", "install"], { cwd: work, stdout: "inherit", stderr: "inherit" });
if (install.exitCode !== 0) {
  console.error("equivalence: bun install failed in work dir");
  process.exit(1);
}
const env: Record<string, string> = {
  ...process.env,
  EQ_PRE: pre,
  EQ_POST: post,
} as Record<string, string>;
const r = Bun.spawnSync(["bunx", "playwright", "test", "--config", "playwright.config.ts"], {
  cwd: work,
  env,
  stdout: "inherit",
  stderr: "inherit",
});
rmSync(work, { recursive: true, force: true });
process.exit(r.exitCode ?? 1);
