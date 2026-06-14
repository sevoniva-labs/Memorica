import { expect, test } from '@playwright/test';

import { uniqueName } from './helpers/api';

test('uniqueName keeps generated usernames valid for backend registration', () => {
  const username = uniqueName('Very Long Prefix With Spaces And Symbols !!! 2026');

  expect(username).toMatch(/^[a-z0-9_-]{3,32}$/);
  expect(username.length).toBeLessThanOrEqual(32);
});
