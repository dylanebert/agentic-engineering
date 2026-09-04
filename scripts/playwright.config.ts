import { defineConfig } from "@playwright/test";

// The figures gate installs the vendored package and therefore takes the published launch recipe.
// Other gates stage this shared config with only Playwright and run plain Chromium semantics.
const REAL_GPU_LAUNCH = await import("@dylanebert/shallot/harness/browser")
  .then((module) => module.REAL_GPU_LAUNCH)
  .catch(() => ({}));

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { headless: true },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "chromium-webgpu", use: { browserName: "chromium", launchOptions: REAL_GPU_LAUNCH } },
  ],
});
