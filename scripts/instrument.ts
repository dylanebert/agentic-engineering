import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Self-terminating instrument self-test. Stages the variance + reduced-motion specs and their
// harness modules into a work dir with @playwright/test, runs playwright, exits. The synthetic
// fixture is inline in the spec, so no build or dist is needed. Display-gated like shot.ts.

const isWsl =
  process.platform === "linux" && existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");

function detectDisplay(): boolean {
  // Test-only override: a seat that always has a display (macOS, WSL) cannot reach the skip
  // branch, so the required-display arms could never be observed red there. This variable
  // simulates a displayless seat for exactly those mutation runs; unset, detection is untouched.
  if (process.env.KEX_SIMULATE_NO_DISPLAY === "1") return false;
  if (isWsl) return true;
  if (process.platform !== "linux") return true;
  return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

if (!detectDisplay()) {
  // Required-display mode: a seat that would otherwise print a skip must exit red instead, so a
  // required-display invocation can never mistake a skipped browser run for a green one.
  const requireDisplay =
    process.env.KEX_REQUIRE_DISPLAY === "1" || process.argv.includes("--require-display");
  if (requireDisplay) {
    console.error(
      "instrument: required-display mode — no display detected, refusing to skip (exit 1)",
    );
    process.exit(1);
  }
  console.log("instrument: no display detected — skipping (exit 0)");
  process.exit(0);
}

function run(cmd: string[], cwd: string): void {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) {
    console.error(`instrument: '${cmd.join(" ")}' failed (exit ${r.exitCode})`);
    process.exit(1);
  }
}

const pkg = JSON.stringify(
  { name: "agentic-engineering-instrument", private: true, dependencies: { "@playwright/test": "^1.50.0" } },
  null,
  2,
);

const work = join(tmpdir(), "agentic-engineering-instrument");
mkdirSync(work, { recursive: true });

// The work dir is reused across runs; sweep stray .spec.ts files a debugging session could
// have staged there before copying the committed set (same hazard as figures.ts's prepWork).
for (const f of readdirSync(work)) {
  if (f.endsWith(".spec.ts")) rmSync(join(work, f), { force: true });
}

for (const f of ["instrument.spec.ts", "variance.ts", "reduced.ts", "png.ts", "playwright.config.ts"]) {
  cpSync(join(import.meta.dir, f), join(work, f));
}
writeFileSync(join(work, "package.json"), pkg);

console.log("instrument: running self-test…");
run(["bun", "install", "--silent"], work);
run(["bunx", "playwright", "install", "chromium"], work);
run(["bunx", "playwright", "test", "--config", "playwright.config.ts"], work);

console.log("instrument: self-test passed");
