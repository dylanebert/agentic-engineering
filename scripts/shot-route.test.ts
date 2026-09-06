import { expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Execute both production wrappers; replace only build/Playwright processes.
// This proves the flag carrier, not browser comparison or golden copy-back.
for (const [label, args, update, expected] of [
  ["ordinary capture ignores unrelated arguments", ["--unrelated"], "0", false],
  ["CLI update", ["--update-snapshots", "--unrelated"], "0", true],
  ["environment update", ["--unrelated"], "1", true],
  ["both forms forward once", ["--update-snapshots"], "1", true],
] as const) {
  test(label, () => {
    const root = mkdtempSync(join(tmpdir(), "shot-route-"));
    try {
      const repo = resolve(import.meta.dir, "..");
      for (const dir of ["scripts", "src"]) cpSync(join(repo, dir), join(root, dir), { recursive: true });
      symlinkSync(join(repo, "node_modules"), join(root, "node_modules"), "dir");
      writeFileSync(join(root, ".gitignore"), "node_modules\noutput/\nargs.json\n");
      writeFileSync(join(root, "package.json"), '{"type":"module"}');
      mkdirSync(join(root, "output"));
      expect(Bun.spawnSync(["git", "init", "--quiet", root]).exitCode).toBe(0);
      writeFileSync(join(root, "preload.ts"), `
import { mkdirSync, writeFileSync } from "node:fs";
const spawn = Bun.spawnSync;
Bun.spawnSync = ((args: string[] | { cmd: string[] }, ...rest: unknown[]) => {
  const command = Array.isArray(args) ? args : args.cmd;
  if (command[0] === "git") return (spawn as Function)(args, ...rest);
  if (!Array.isArray(args)) throw new Error("unexpected spawn options");
  if (args[0] === "bun" && args[1] === "run" && args[2] === "build") {
    mkdirSync(args[4], { recursive: true });
    return { exitCode: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  }
  if (args[0] === "bunx" && args[1] === "playwright") {
    writeFileSync("args.json", JSON.stringify(args));
    throw new Error("shot-route: intercepted before browser launch");
  }
  throw new Error("unexpected child command: " + JSON.stringify(args));
}) as typeof Bun.spawnSync;
`);
      const child = Bun.spawnSync([process.execPath, "--preload", "./preload.ts", "scripts/shot.ts", ...args], {
        cwd: root,
        env: { ...process.env, UPDATE_SNAPSHOTS: update, CAMPAIGN_OUTPUT: join(root, "output"), CAMPAIGN_LEDGER: "", KEX_SIMULATE_NO_DISPLAY: "0", DISPLAY: ":fixture" },
        stdout: "pipe", stderr: "pipe",
      });
      expect(child.exitCode).toBe(1);
      expect(child.stderr.toString()).toContain("shot-route: intercepted before browser launch");
      expect(JSON.parse(readFileSync(join(root, "args.json"), "utf8"))).toEqual([
        "bunx", "playwright", "test", "--config", "playwright.config.ts",
        ...(expected ? ["--update-snapshots"] : []),
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
