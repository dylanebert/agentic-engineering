import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Self-terminating full-page capture. Build the site, serve `dist`, screenshot desktop + mobile,
// exit. Never leaves a dev server or browser open. Display-gated: on bare Linux without a display
// it skips. On WSL the browser lives on the Windows host, so the work dir (dist + the capture
// spec + its deps) is staged onto Windows TEMP and driven through PowerShell via `playwright
// test` — direct playwright library use under bun-on-Windows hangs at launch, the runner works.

const repo = join(import.meta.dir, "..");
const isWsl =
  process.platform === "linux" && existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");

function detectDisplay(): boolean {
  if (isWsl) return true;
  if (process.platform !== "linux") return true;
  return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

if (!detectDisplay()) {
  console.log("shot: no display detected — skipping capture (exit 0)");
  process.exit(0);
}

function run(cmd: string[], cwd: string): void {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) {
    console.error(`shot: '${cmd.join(" ")}' failed (exit ${r.exitCode})`);
    process.exit(1);
  }
}

const capturePkg = JSON.stringify(
  { name: "agentic-engineering-capture", private: true, dependencies: { "@playwright/test": "^1.50.0" } },
  null,
  2,
);

console.log("shot: building…");
run(["bun", "run", "build"], repo);

const shots = join(repo, "shots");
mkdirSync(shots, { recursive: true });

// Stage dist + the capture spec into a stable work dir. node_modules and the installed browser
// are left in place across runs — refreshing only dist + the spec keeps reruns fast.
function prepWork(workDir: string): void {
  mkdirSync(workDir, { recursive: true });
  cpSync(join(import.meta.dir, "capture.spec.ts"), join(workDir, "capture.spec.ts"));
  cpSync(join(import.meta.dir, "playwright.config.ts"), join(workDir, "playwright.config.ts"));
  writeFileSync(join(workDir, "package.json"), capturePkg);
  rmSync(join(workDir, "dist"), { recursive: true, force: true });
  cpSync(join(repo, "dist"), join(workDir, "dist"), { recursive: true });
  rmSync(join(workDir, "desktop.png"), { force: true });
  rmSync(join(workDir, "mobile.png"), { force: true });
}

function collect(workDir: string): void {
  for (const name of ["desktop.png", "mobile.png"]) {
    const src = join(workDir, name);
    if (!existsSync(src)) {
      console.error(`shot: expected ${name} was not produced`);
      process.exit(1);
    }
    cpSync(src, join(shots, name));
  }
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
  const workWin = `${winTemp}\\agentic-engineering-shot`;
  const workWsl = new TextDecoder()
    .decode(Bun.spawnSync(["wslpath", workWin], { stdout: "pipe" }).stdout)
    .trim();

  prepWork(workWsl);
  console.log("shot: capturing on the Windows host…");
  const r = Bun.spawnSync(
    [
      "powershell.exe",
      "-Command",
      `$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA\\ms-playwright"; cd '${workWin}'; bun install --silent; bunx playwright install chromium; bunx playwright test --config playwright.config.ts`,
    ],
    { stdout: "inherit", stderr: "inherit", timeout: 480_000 },
  );
  if (r.exitCode !== 0) {
    console.error(`shot: capture failed on the Windows host (exit ${r.exitCode})`);
    process.exit(1);
  }
  collect(workWsl);
} else {
  const work = join(tmpdir(), "agentic-engineering-shot");
  prepWork(work);
  run(["bun", "install", "--silent"], work);
  run(["bunx", "playwright", "install", "chromium"], work);
  run(["bunx", "playwright", "test", "--config", "playwright.config.ts"], work);
  collect(work);
}

console.log(`shot: wrote ${join(shots, "desktop.png")}`);
console.log(`shot: wrote ${join(shots, "mobile.png")}`);
