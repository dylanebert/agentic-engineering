import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(root, "cases.json"), "utf8")) as {cohort: string}[];
const fault = process.env.CAMPAIGN_FIXTURE_FAULT;
const fixture = process.env.CAMPAIGN_FIXTURE_CHILD === "1";
const gpu = cases.some(item => item.cohort === "gpu");
const REAL_GPU_LAUNCH = fault === "empty-gpu" ? {} : gpu
  ? (await import("@dylanebert/shallot/harness/browser")).REAL_GPU_LAUNCH
  : undefined;
if (fixture) {
  const { record } = await import("./campaign");
  record("fixture-configuration", { gpu, options: REAL_GPU_LAUNCH });
}
if (gpu && (!REAL_GPU_LAUNCH || Object.keys(REAL_GPU_LAUNCH).length === 0)) throw new Error("predicate:runner.gpu-config: GPU cohort requires nonempty REAL_GPU_LAUNCH");

export default defineConfig({
  testDir: ".",
  testMatch: process.env.CAMPAIGN_SELECTION === "runtime" ? ["runtime.spec.ts"] : fixture ? ["instrument.spec.ts"] : ["instrument.spec.ts", "figures.spec.ts", "capture.spec.ts", "runtime.spec.ts"],
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/capture.spec.ts-snapshots/{arg}-{projectName}-{platform}{ext}",
  use: { headless: true },
  projects: [
    ...(process.env.CAMPAIGN_SELECTION === "runner" ? [] : [{ name: "chromium", grep: fixture ? /@fixture-(plain|pure)\b/ : /@(plain|pure)\b/, use: { browserName: "chromium" as const } }]),
    ...(fault === "redundant-launch" ? [{ name: "duplicate-plain", grep: /@fixture-plain\b/, use: { browserName: "chromium" as const } }] : []),
    ...(cases.some(item => item.cohort === "fresh") ? [{ name: "fresh-start", grep: /@fixture-fresh\b/, use: { browserName: "chromium" as const } }] : []),
    ...(!fixture && ["R3", "instrument", "runner"].includes(process.env.CAMPAIGN_SELECTION ?? "") ? [{ name: "runner-verdict", grep: /@runner\b/ }] : []),
    ...(gpu ? [{ name: "chromium-webgpu", grep: fixture ? /@fixture-gpu\b/ : /@gpu\b/, use: { browserName: "chromium" as const, launchOptions: REAL_GPU_LAUNCH } }] : []),
  ],
});
