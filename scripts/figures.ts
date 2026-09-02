import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDisplay } from "./display";
import { playwrightVersion } from "./playwright-version";

// Self-terminating figure gate. Six neutral-template contracts (missing-asset-404,
// neutral-hierarchy, readable-measure, selected-desktop-measure, emphasis-and-rhythm, story
// non-interference) plus the S3 figure arms: manifest siting, claim lead-in, register (zero
// figcaptions, nothing above the opening section), ordered geometry, and label-in-prose. The spectrum and page-dress arms retired when their production
// subject disappeared. Display-gated like shot.ts; WSL stages onto
// Windows TEMP and runs through PowerShell.

const repo = join(import.meta.dir, "..");

const vocabulary = Bun.spawnSync(["bun", "run", "oracle-vocabulary"], {
  cwd: repo,
  stdout: "inherit",
  stderr: "inherit",
});
if (vocabulary.exitCode !== 0) process.exit(vocabulary.exitCode);

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
  { name: "agentic-engineering-figures", private: true, dependencies: { "@playwright/test": playwrightVersion } },
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
  for (const f of ["figures.spec.ts", "variance.ts", "reduced.ts", "png.ts", "playwright.config.ts", "prose-capture.txt"]) {
    cpSync(join(import.meta.dir, f), join(workDir, f));
  }
  // The figure arms read the manifest as an external expectation rather than off the page they
  // are checking, so the declaration module is staged beside the spec.
  cpSync(join(import.meta.dir, "../src/lib/figures.ts"), join(workDir, "manifest.ts"));
  // The palette declaration is the role-binding arm's external expectation, staged the same way.
  cpSync(join(import.meta.dir, "../src/lib/vocabulary.ts"), join(workDir, "vocabulary.ts"));
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
