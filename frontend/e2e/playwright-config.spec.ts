import { expect, test } from '@playwright/test';

import config from '../playwright.config';

test('Playwright defaults to the preferred localhost development URL', () => {
  expect(config.use?.baseURL).toBe('http://localhost:5173');

  const webServer = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
  expect(webServer?.url).toBe('http://localhost:5173');
  expect(webServer?.command).toBe('npm run dev -- --host 0.0.0.0 --port 5173');
});
