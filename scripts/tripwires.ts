import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { playwrightVersion } from "./playwright-version";

// Self-terminating prose tripwire gate (prose.md Concision, spec validation 3). Builds the site,
// stages dist + the tripwire spec into a work dir, runs playwright over the built page's rendered
// text, exits. Two numbers, both derived in prose.md from measured reference prose: no rendered
// paragraph over 79 words, and relativizers (that/which/who/whom/whose) under 12.0 per 1,000
// words over the whole document. Rendered text rather than source, for the same reason the text
// oracle reads rendered text: it counts what a reader reads, not markup.
// Display-gated like shot.ts; WSL branch stages onto Windows TEMP and runs through PowerShell.

const repo = join(import.meta.dir, "..");
const isWsl =
  process.platform === "linux" && existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");

function detectDisplay(): boolean {
  if (isWsl) return true;
  if (process.platform !== "linux") return true;
  return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

if (!detectDisplay()) {
  console.log("tripwires: no display detected — skipping (exit 0)");
  process.exit(0);
}

function run(cmd: string[], cwd: string): void {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) {
    console.error(`tripwires: '${cmd.join(" ")}' failed (exit ${r.exitCode})`);
    process.exit(1);
  }
}

const pkg = JSON.stringify(
  { name: "agentic-engineering-tripwires", private: true, dependencies: { "@playwright/test": playwrightVersion } },
  null,
  2,
);

console.log("tripwires: building…");
run(["bun", "run", "build"], repo);

function prepWork(workDir: string): void {
  mkdirSync(workDir, { recursive: true });
  for (const f of ["tripwires.spec.ts", "playwright.config.ts"]) {
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
  const workWin = `${winTemp}\\agentic-engineering-tripwires`;
  const workWsl = new TextDecoder()
    .decode(Bun.spawnSync(["wslpath", workWin], { stdout: "pipe" }).stdout)
    .trim();

  prepWork(workWsl);
  console.log("tripwires: running on the Windows host…");
  const r = Bun.spawnSync(
    [
      "powershell.exe",
      "-Command",
      `$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\\ms-playwright"; cd '${workWin}'; bun install --silent; bunx playwright install chromium; bunx playwright test --config playwright.config.ts`,
    ],
    { stdout: "inherit", stderr: "inherit", timeout: 480_000 },
  );
  if (r.exitCode !== 0) {
    console.error(`tripwires: gate failed on the Windows host (exit ${r.exitCode})`);
    process.exit(1);
  }
} else {
  const work = join(tmpdir(), "agentic-engineering-tripwires");
  prepWork(work);
  run(["bun", "install", "--silent"], work);
  run(["bunx", "playwright", "install", "chromium"], work);
  run(["bunx", "playwright", "test", "--config", "playwright.config.ts"], work);
}

console.log("tripwires: gate passed");
