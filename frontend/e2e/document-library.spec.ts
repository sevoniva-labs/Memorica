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

async function loginWithMockApi(
  page: Page,
  options: {
    workspaceDocuments?: ReturnType<typeof documentItem>[];
    recentDocuments?: ReturnType<typeof documentItem>[];
  } = {}
) {
  const workspaceDocuments = options.workspaceDocuments || [];
  const recentDocuments = options.recentDocuments || [];

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
      body: JSON.stringify({ data: { content: recentDocuments } }),
    });
  });
  await page.route(`**/api/v1/documents/workspace/${workspace.id}**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: workspaceDocuments } }),
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

test('document library shows Pro-style empty state actions', async ({ page }) => {
  await loginWithMockApi(page);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: '文档库' })).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole('tab', { name: /我拥有的/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '新建文档' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新建文件夹' })).toBeVisible();
  await expect(page.getByRole('button', { name: '从模板开始' })).toBeVisible();
  await expect(page.getByTestId('memorica-library-surface')).toBeVisible();
});

test('document library desktop layout keeps Pro sections separated', async ({ page }) => {
  const rowDocument = documentItem('doc-layout', '布局验收文档');

  await page.setViewportSize({ width: 1440, height: 900 });
  await loginWithMockApi(page, { workspaceDocuments: [rowDocument], recentDocuments: [rowDocument] });

  await page.goto('/');

  const titleBox = await page.getByRole('heading', { name: '文档库' }).boundingBox();
  const surfaceBox = await page.getByTestId('memorica-library-surface').boundingBox();
  const actionBox = await page.locator('.memorica-action-grid').boundingBox();
  const tabsBox = await page.locator('.memorica-fly-tabs').boundingBox();
  const tableBox = await page.locator('.memorica-table').boundingBox();
  const screenshot = await page.screenshot({ fullPage: true });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );

  expect(titleBox).toBeTruthy();
  expect(surfaceBox).toBeTruthy();
  expect(actionBox).toBeTruthy();
  expect(tabsBox).toBeTruthy();
  expect(tableBox).toBeTruthy();
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
  expect(hasHorizontalOverflow).toBe(false);
  expect(surfaceBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
  expect(tabsBox!.y).toBeGreaterThan(actionBox!.y + actionBox!.height);
  expect(tableBox!.y).toBeGreaterThan(tabsBox!.y);
});

test('delete action is hidden until row more menu opens', async ({ page }) => {
  const rowDocument = documentItem('doc-row-actions', '项目复盘');

  await loginWithMockApi(page, { workspaceDocuments: [rowDocument], recentDocuments: [rowDocument] });

  await page.goto('/');

  await expect(page.getByTestId('memorica-library-surface').getByText('项目复盘')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole('button', { name: '删除文档' })).not.toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();

  await expect(page.getByRole('menuitem', { name: '删除' })).toBeVisible();
});
