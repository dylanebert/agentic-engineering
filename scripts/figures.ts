import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDisplay } from "./display";

// Self-terminating figure gate (oracles 5, 5b, 6, contrast sweep, 8, 17, 20 and 21, plus the
// S2 missing-asset 404 server contract). Builds the site, stages dist + the figure spec and its
// harness modules into a work dir, runs playwright, exits. Serves the built dist over a local
// origin (not a dev server). Stage I widened oracles 5 and 6 from the figure box to the whole
// page: the morph driver sets --pos on :root at three sampled positions (0 = vibe, 0.5 = kex,
// 1 = win98), and assertVaries/assertReducedMotion read the rendered page (body) via pixel
// screenshots — not CSS variables. Also binds the end descriptors to their ends (oracle 5b, new
// at I) alongside the existing end-labels arm, sweeps --pos in 0.05 steps asserting WCAG contrast
// ≥ 4.5 across three channels: text-dim, text-muted, and heading-text (criterion 18, the only
// interior-sampling arm), and reads the applied type off the built page at all three positions
// (criterion 8, widened at J). Stage J added the referent-vocabulary arm (criterion 17): at pos=1
// the rendered body and heading faces must differ from their pos=0.5 resolution on the canvas
// width-measurement channel. Stage K added the vibe-vocabulary arm (criterion 20) and the
// reachability arm (criterion 21). S2 added the missing-asset 404 server contract, and S2's
// repair round split reachability in two: a production-path arm that drives the real slider
// input (keyboard on the handle, pointer clicks on the track) and reads the resulting classes,
// and the original direct-set coverage kept under a parity name — it proves only that the gate
// drivers' own class toggles match the documented thresholds, not that production reaches them.
// Seventeen arms total, by name: page-varies, page-reduced-motion, page-contrast-sweep,
// fill-distinguishable, end-labels-bound, end-descriptors-bound, font-application,
// referent-vocabulary, vibe-vocabulary, reachability-driver-parity, reachability-production,
// missing-asset-404, neutral-hierarchy, readable-measure, selected-desktop-measure,
// emphasis-and-rhythm, non-interference. Display-gated like shot.ts; WSL branch stages onto
// Windows TEMP and runs through PowerShell.

const repo = join(import.meta.dir, "..");
const isWsl =
  process.platform === "linux" && existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");

if (!requireDisplay("figures")) process.exit(0);

function run(cmd: string[], cwd: string): void {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) {
    console.error(`figures: '${cmd.join(" ")}' failed (exit ${r.exitCode})`);
    process.exit(1);
  }
}

const pkg = JSON.stringify(
  { name: "agentic-engineering-figures", private: true, dependencies: { "@playwright/test": "1.62.1" } },
  null,
  2,
);

console.log("figures: building…");
run(["bun", "run", "build"], repo);

function prepWork(workDir: string): void {
  mkdirSync(workDir, { recursive: true });
  // The work dir is reused across runs. A stray .spec.ts left behind by a debugging session
  // would be picked up by the config's testMatch and silently widen (or poison) the gate's
  // assertion set — witnessed: a debug.spec.ts staged directly in the work dir ran on every
  // figures pass. Remove every spec staging does not own before copying the committed set.
  for (const f of readdirSync(workDir)) {
    if (f.endsWith(".spec.ts")) rmSync(join(workDir, f), { force: true });
  }
  for (const f of ["figures.spec.ts", "variance.ts", "reduced.ts", "png.ts", "playwright.config.ts"]) {
    cpSync(join(import.meta.dir, f), join(workDir, f));
  }
  writeFileSync(join(workDir, "package.json"), pkg);
  rmSync(join(workDir, "dist"), { recursive: true, force: true });
  cpSync(join(repo, "dist"), join(workDir, "dist"), { recursive: true });
}

if (isWsl) {
  const winTemp = new TextDecoder()
    .decode(
      Bun.spawnSync(["powershell.exe", "-Command", "Write-Host -NoNewline $env:TEMP"], {
        stdout: "pipe",
      }).stdout,
    )
    .trim()
    .replace(/\r/g, "");
  const workWin = `${winTemp}\\agentic-engineering-figures`;
  const workWsl = new TextDecoder()
    .decode(Bun.spawnSync(["wslpath", workWin], { stdout: "pipe" }).stdout)
    .trim();

  prepWork(workWsl);
  console.log("figures: running on the Windows host…");
  const r = Bun.spawnSync(
    [
      "powershell.exe",
      "-Command",
      `$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\\ms-playwright"; cd '${workWin}'; bun install --silent; bunx playwright install chromium; bunx playwright test --config playwright.config.ts`,
    ],
    { stdout: "inherit", stderr: "inherit", timeout: 480_000 },
  );
  if (r.exitCode !== 0) {
    console.error(`figures: gate failed on the Windows host (exit ${r.exitCode})`);
    process.exit(1);
  }
} else {
  const work = join(tmpdir(), "agentic-engineering-figures");
  prepWork(work);
  run(["bun", "install", "--silent"], work);
  run(["bunx", "playwright", "install", "chromium"], work);
  run(["bunx", "playwright", "test", "--config", "playwright.config.ts"], work);
}

console.log("figures: gate passed");
