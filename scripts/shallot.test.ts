import { check } from "@dylanebert/shallot/harness/check";

check(
  "public Shallot frame contract stays fixed",
  { claim: "public Shallot frame contract stays fixed, so a changed capture geometry cannot pass", subject: ["package.json", "bun.lock", "src/lib/hero-engine.ts", "scripts/hero-startup.ts", "scripts/shot.ts"] },
  async () => {
    const { CAPTURE_CONTRACT, captureIdentityLabel } = await import("@dylanebert/shallot/harness/capture");
    if (captureIdentityLabel(CAPTURE_CONTRACT) !== "final-canvas 1280x720@1 rgba8-tight") {
      throw new Error("public capture contract changed");
    }
  },
);

check(
  "hero capture uses the installed Shallot candidate",
  {
    claim: "the live hero capture proves the installed Shallot candidate on a real Chromium seat, so a missing public frame path reds",
    size: "integration",
    requires: ["chromium"],
    host: "mac",
    subject: ["package.json", "bun.lock", "src/lib/hero-engine.ts", "scripts/hero-startup.ts", "scripts/shot.ts"],
    budget: 20_000,
  },
  () => {
    const result = Bun.spawnSync(["bun", "run", "hero:check"], { cwd: process.cwd(), stdout: "inherit", stderr: "inherit" });
    if (result.exitCode !== 0) throw new Error(`hero capture failed with exit ${result.exitCode}`);
  },
);

check(
  "shot gate remains independent of Shallot frame claims",
  {
    claim: "the general Playwright shot gate remains independently green, so changing unrelated page evidence cannot be hidden by Shallot capture",
    size: "integration",
    requires: ["chromium"],
    host: "mac",
    subject: ["scripts/shot.ts", "scripts/capture.spec.ts", "scripts/arms.ts"],
    budget: 20_000,
  },
  () => {
    const result = Bun.spawnSync(["bun", "run", "shot"], { cwd: process.cwd(), stdout: "inherit", stderr: "inherit" });
    if (result.exitCode !== 0) throw new Error(`shot gate failed with exit ${result.exitCode}`);
  },
);
