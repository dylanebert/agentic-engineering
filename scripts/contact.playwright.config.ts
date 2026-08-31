import { defineConfig } from "@playwright/test";

// Contact-sheet config: one worker (the spec shares module state across arms — the collection
// in beforeAll is the snapshot every arm reads), no dev-server wrapper (contact.ts starts its
// own origin), and a long per-test ceiling for the ten page loads plus sheet composition.
export default defineConfig({
  testDir: ".",
  testMatch: /contact\.spec\.ts/,
  workers: 1,
  reporter: [["list"]],
  timeout: 300_000,
});
