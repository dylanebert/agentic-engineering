import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const population = JSON.parse(readFileSync(join(root, "cases.json"), "utf8")) as {id: string; cohort: string; group: string}[];
const cases = process.env.CAMPAIGN_FIXTURE_CHILD === "1" || !process.env.CAMPAIGN_PENDING ? population : population.filter(c => JSON.parse(process.env.CAMPAIGN_PENDING!).includes(c.id));
const fault = process.env.CAMPAIGN_FIXTURE_FAULT;
const fixture = process.env.CAMPAIGN_FIXTURE_CHILD === "1";
const selection = fixture ? { only: [], qualify: false } : JSON.parse(process.env.CAMPAIGN_SELECTION ?? "null");
if (!fixture && (!selection || !Array.isArray(selection.only) || !selection.only.length)) throw new Error("missing selection");
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
  testMatch: fixture ? ["instrument.spec.ts"] : [
    ...(selection.only.some((s: string) => ["pure", "runner"].includes(s)) ? ["instrument.spec.ts"] : []),
    ...(selection.only.some((s: string) => ["figure", "text", "prose"].includes(s)) || cases.some(c => c.group === "self") ? ["figures.spec.ts"] : []),
    ...(selection.only.includes("capture") ? ["capture.spec.ts"] : []),
    ...(selection.only.includes("runtime") ? ["runtime.spec.ts", "figures.spec.ts"] : []),
  ],
  timeout: !fixture && selection.only.includes("runtime") ? 120_000 : 30_000,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  reporter: "list",
  snapshotPathTemplate: "{testDir}/capture.spec.ts-snapshots/{arg}-{projectName}-{platform}{ext}",
  use: { headless: true },
  projects: [
    ...(!fixture && !cases.length && selection.only.every((s: string) => s === "runner") ? [] : [{ name: "chromium", grep: fixture ? /@fixture-(plain|pure)\b/ : selection.only.includes("pure") ? /@(plain|pure)\b/ : /@plain\b/, use: { browserName: "chromium" as const } }]),
    ...(fault === "redundant-launch" ? [{ name: "duplicate-plain", grep: /@fixture-plain\b/, use: { browserName: "chromium" as const } }] : []),
    ...(cases.some(item => item.cohort === "fresh") ? [{ name: "fresh-start", grep: /@fixture-fresh\b/, use: { browserName: "chromium" as const } }] : []),
    ...(!fixture && selection.only.includes("runner") ? [{ name: "runner-verdict", grep: /@runner\b/ }] : []),
    ...(gpu ? [{ name: "chromium-webgpu", grep: fixture ? /@fixture-gpu\b/ : /@gpu\b/, use: { browserName: "chromium" as const, launchOptions: REAL_GPU_LAUNCH } }] : []),
  ],
});
