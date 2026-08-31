import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDisplay } from "./display";

// Self-terminating instrument self-test. Stages the variance + reduced-motion specs and their
// harness modules into a work dir with @playwright/test, runs playwright, exits. The synthetic
// fixture is inline in the spec, so no build or dist is needed. Display-gated like shot.ts.

if (!requireDisplay("instrument")) process.exit(0);

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
