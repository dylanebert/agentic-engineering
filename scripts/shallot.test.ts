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
