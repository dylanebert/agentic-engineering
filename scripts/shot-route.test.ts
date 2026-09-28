import { expect, test } from "bun:test";
import { capturePlaywrightArgs, updateSnapshotsRequested } from "./shot-routing";

// Exercise the routing decisions used by the production shot and campaign commands. The browser
// capture itself belongs to `bun run shot`.
for (const [label, args, update, expected] of [
  ["ordinary capture ignores unrelated arguments", ["--unrelated"], "0", false],
  ["CLI update", ["--update-snapshots", "--unrelated"], "0", true],
  ["environment update", ["--unrelated"], "1", true],
  ["both forms forward once", ["--update-snapshots"], "1", true],
] as const) {
  test(label, () => {
    const requested = updateSnapshotsRequested(args, { UPDATE_SNAPSHOTS: update });
    expect(capturePlaywrightArgs(requested)).toEqual([
      "bunx",
      "playwright",
      "test",
      "--config",
      "playwright.config.ts",
      ...(expected ? ["--update-snapshots"] : []),
    ]);
  });
}
