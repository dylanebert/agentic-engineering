import { BROWSER_CONFIG, WEB_SERVER_CONFIG } from "@dylanebert/shallot/testing";
import type { PlaywrightTestConfig } from "@playwright/test";

export default {
  ...BROWSER_CONFIG,
  testDir: "./src/lib",
  testMatch: "**/*.e2e.ts",
  outputDir: "/tmp/agentic-engineering-playwright",
  use: {
    ...BROWSER_CONFIG.use,
    headless: true,
    reducedMotion: "reduce",
    baseURL: "http://127.0.0.1:4174",
  },
  webServer: {
    command: "bunx vite build && bunx vite preview --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174/agentic-engineering/",
    ...WEB_SERVER_CONFIG,
  },
} satisfies PlaywrightTestConfig;
