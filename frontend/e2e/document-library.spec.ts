import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 1001,
  username: 'library_user',
  displayName: 'Library User',
  email: 'library@example.test',
  color: '#245bdb',
};

const workspace = {
  id: 'workspace-main',
  name: 'Library Workspace',
  role: 'owner',
  createdAt: '2026-06-14T08:00:00.000Z',
};

function documentItem(id: string, title = '未命名文档') {
  const now = '2026-06-14T08:00:00.000Z';
  return {
    id,
    title,
    ownerName: user.displayName,
    workspaceId: workspace.id,
    itemType: 'document',
    wordCount: 0,
    charCount: 0,
    isPublic: false,
    isFavorite: false,
    canWrite: true,
    canManage: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function loginWithMockApi(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'mock-access-token');
    window.localStorage.setItem('refreshToken', 'mock-refresh-token');
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: user }),
    });
  });
  await page.route('**/api/v1/workspaces', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [workspace] }),
    });
  });
  await page.route('**/api/v1/documents/recent**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });
  await page.route(`**/api/v1/documents/workspace/${workspace.id}**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });
}

test('double clicking new document creates only one document', async ({ page }) => {
  let createRequests = 0;
  const created = documentItem('doc-created-once');

  await loginWithMockApi(page);
  await page.route('**/api/v1/documents', async (route) => {
    if (route.request().method() === 'POST') {
      createRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: created }),
      });
      return;
    }
    await route.continue();
  });
  await page.route(`**/api/v1/documents/${created.id}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: created }),
    });
  });

  await page.goto('/');
  const createButton = page.getByTestId('memorica-create-document');
  await expect(createButton).toBeVisible({ timeout: 12_000 });
  await createButton.dblclick();

  await expect(page).toHaveURL(/\/doc\/doc-created-once/, { timeout: 15_000 });
  expect(createRequests).toBe(1);
});

test('document list load failure shows inline retry', async ({ page }) => {
  let sharedRequests = 0;

  await loginWithMockApi(page);
  await page.route('**/api/v1/documents/shared**', async (route) => {
    sharedRequests += 1;
    if (sharedRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'TEST_LIST_FAILURE' }),
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });

  await page.goto('/');
  await page.getByRole('tab', { name: '与我共享' }).click();

  await expect(page.getByTestId('memorica-list-error')).toContainText('文档列表加载失败');
  await page.getByTestId('memorica-list-retry').click();

  await expect(page.getByTestId('memorica-list-error')).not.toBeVisible({ timeout: 12_000 });
  expect(sharedRequests).toBe(2);
});
