import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: { timeout: 3_000 },
  reporter: [['list'], ['json', { outputFile: 'results/playwright.json' }]],
  outputDir: 'results/artifacts',
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://127.0.0.1:18765',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/http-server/bin/http-server app -a 127.0.0.1 -p 18765 -c-1',
    url: 'http://127.0.0.1:18765',
    reuseExistingServer: false,
    timeout: 10_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
