import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Self-terminating rendered-text oracle (criteria 3 and 4, amended at E's review; widened at I
// to three sampled morph positions). Builds the site, stages dist + the oracle spec and its deps
// into a work dir, runs playwright, exits. Serves the built dist over a local origin (not a dev
// server), extracts the page's visible text at all three morph positions (0 = vibe, 0.5 = kex,
// 1 = win98), and runs the voice ban list, the em-dash cap, and the novelty regex over that text.
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
  console.log("oracle-text: no display detected — skipping (exit 0)");
  process.exit(0);
}

function run(cmd: string[], cwd: string): void {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) {
    console.error(`oracle-text: '${cmd.join(" ")}' failed (exit ${r.exitCode})`);
    process.exit(1);
  }
}

const pkg = JSON.stringify(
  { name: "agentic-engineering-oracle-text", private: true, dependencies: { "@playwright/test": "^1.50.0" } },
  null,
  2,
);

console.log("oracle-text: building…");
run(["bun", "run", "build"], repo);

function prepWork(workDir: string): void {
  mkdirSync(workDir, { recursive: true });
  for (const f of ["oracle-text.spec.ts", "playwright.config.ts"]) {
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
  const workWin = `${winTemp}\\agentic-engineering-oracle-text`;
  const workWsl = new TextDecoder()
    .decode(Bun.spawnSync(["wslpath", workWin], { stdout: "pipe" }).stdout)
    .trim();

  prepWork(workWsl);
  console.log("oracle-text: running on the Windows host…");
  const r = Bun.spawnSync(
    [
      "powershell.exe",
      "-Command",
      `$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\\ms-playwright"; cd '${workWin}'; bun install --silent; bunx playwright install chromium; bunx playwright test --config playwright.config.ts`,
    ],
    { stdout: "inherit", stderr: "inherit", timeout: 480_000 },
  );
  if (r.exitCode !== 0) {
    console.error(`oracle-text: gate failed on the Windows host (exit ${r.exitCode})`);
    process.exit(1);
  }
} else {
  const work = join(tmpdir(), "agentic-engineering-oracle-text");
  prepWork(work);
  run(["bun", "install", "--silent"], work);
  run(["bunx", "playwright", "install", "chromium"], work);
  run(["bunx", "playwright", "test", "--config", "playwright.config.ts"], work);
}

console.log("oracle-text: gate passed");
