import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { campaignPlaywrightArgs } from "./campaign";
import { shotPlaywrightArgs } from "./shot";

const base = ["bunx", "playwright", "test", "--config", "playwright.config.ts"];
const shotSource = readFileSync(join(import.meta.dir, "shot.ts"), "utf8");
const campaignSource = readFileSync(join(import.meta.dir, "campaign.ts"), "utf8");

for (const [label, argv, update, expected] of [
  ["ordinary capture ignores unrelated arguments", ["--unrelated"], "0", false],
  ["CLI update", ["--update-snapshots", "--unrelated"], "0", true],
  ["environment update", ["--unrelated"], "1", true],
  ["both forms forward once", ["--update-snapshots"], "1", true],
] as const) {
  test(label, () => {
    expect(shotPlaywrightArgs(argv, { UPDATE_SNAPSHOTS: update })).toEqual([
      ...base,
      ...(expected ? ["--update-snapshots"] : []),
    ]);
  });
}

test("campaign argument builder keeps forwarding selection-specific", () => {
  expect(campaignPlaywrightArgs("capture", false, ["--unrelated"])).toEqual(base);
  expect(campaignPlaywrightArgs("capture", true)).toEqual([...base, "--update-snapshots"]);
  expect(campaignPlaywrightArgs("runtime", false, ["--project", "chromium"])).toEqual([
    ...base,
    "--project",
    "chromium",
  ]);
  expect(campaignPlaywrightArgs("runtime-witnesses", false, [
    "--runtime-witnesses",
    "--project",
    "chromium-webgpu",
    "--grep",
    "^runtime/article/gpu/1$",
  ])).toEqual([
    ...base,
    "--project",
    "chromium-webgpu",
    "--grep",
    "runtime/article/gpu/1",
  ]);
});

test("production entries call the argument builders exercised above", () => {
  expect(shotSource).toContain("const args = shotPlaywrightArgs(process.argv");
  expect(shotSource).toContain('campaign("capture", [], update, args)');
  expect(campaignSource).toContain("playwrightArgs ?? campaignPlaywrightArgs(selection");
});
