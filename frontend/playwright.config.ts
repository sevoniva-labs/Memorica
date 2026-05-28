import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174';
const webServerURL = process.env.E2E_WEB_SERVER_URL || baseURL;
const webServerCommand =
  process.env.E2E_WEB_SERVER_COMMAND || 'npm run dev -- --host 127.0.0.1 --port 5174';
const webServer = process.env.E2E_SKIP_WEB_SERVER === 'true'
  ? undefined
  : {
      command: webServerCommand,
      url: webServerURL,
      reuseExistingServer: !process.env.CI,
      timeout: 45_000,
    };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer,
});
