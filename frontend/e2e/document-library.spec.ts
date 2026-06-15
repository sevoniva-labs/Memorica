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
  const moreButton = page.locator('.memorica-library-actions').getByRole('button', { name: '更多', exact: true });
  await expect(moreButton).toBeVisible();
  await moreButton.click();
  await expect(page.getByRole('menuitem', { name: '从模板开始' })).toBeVisible();
  await expect(page.getByTestId('memorica-library-surface')).toBeVisible();
});

test('document library desktop layout keeps Pro workbench sections separated', async ({ page }) => {
  const rowDocument = documentItem('doc-layout', '布局验收文档');

  await page.setViewportSize({ width: 1440, height: 900 });
  await loginWithMockApi(page, { workspaceDocuments: [rowDocument], recentDocuments: [rowDocument] });

  await page.goto('/');

  const titleBox = await page.getByRole('heading', { name: '文档库' }).boundingBox();
  const surfaceBox = await page.getByTestId('memorica-library-surface').boundingBox();
  const actionBox = await page.locator('.memorica-library-actions').boundingBox();
  const tabsBox = await page.locator('.memorica-fly-tabs').boundingBox();
  const tableBox = await page.locator('.memorica-desktop-table').boundingBox();
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
  await expect(page.locator('.memorica-action-tile')).toHaveCount(0);
  expect(surfaceBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
  expect(actionBox!.height).toBeLessThan(48);
  expect(tabsBox!.y).toBeGreaterThan(actionBox!.y);
  expect(tableBox!.y).toBeGreaterThan(tabsBox!.y);
});

test('document library wide layout uses the available workspace width', async ({ page }) => {
  const rowDocument = documentItem('doc-wide-layout', '宽屏验收文档');

  await page.setViewportSize({ width: 1920, height: 1000 });
  await loginWithMockApi(page, { workspaceDocuments: [rowDocument], recentDocuments: [rowDocument] });

  await page.goto('/');

  const surfaceBox = await page.getByTestId('memorica-library-surface').boundingBox();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );

  expect(surfaceBox).toBeTruthy();
  expect(surfaceBox!.width).toBeGreaterThan(1550);
  expect(hasHorizontalOverflow).toBe(false);
});

test('document library tablet layout keeps toolbar and table readable', async ({ page }) => {
  const rowDocument = documentItem('doc-tablet-layout', '平板验收文档');

  await page.setViewportSize({ width: 768, height: 900 });
  await loginWithMockApi(page, { workspaceDocuments: [rowDocument], recentDocuments: [rowDocument] });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: '文档库' })).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole('button', { name: '新建文档' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新建文件夹' })).toBeVisible();
  await expect(page.locator('.memorica-library-actions').getByRole('button', { name: '更多', exact: true })).toBeVisible();
  await expect(page.locator('.memorica-desktop-table').getByText('平板验收文档')).toBeVisible();
  await expect(page.locator('.memorica-desktop-table')).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );

  expect(hasHorizontalOverflow).toBe(false);
});

test('document library mobile layout uses readable document list rows', async ({ page }) => {
  const rowDocument = documentItem('doc-mobile-layout', '手机验收文档');

  await page.setViewportSize({ width: 390, height: 844 });
  await loginWithMockApi(page, { workspaceDocuments: [rowDocument], recentDocuments: [rowDocument] });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: '文档库' })).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole('button', { name: '新建文档' })).toBeVisible();
  await expect(page.locator('.memorica-mobile-list')).toBeVisible();
  await expect(page.locator('.memorica-desktop-table')).not.toBeVisible();
  await expect(page.locator('.memorica-mobile-list').getByText('手机验收文档')).toBeVisible();
  await expect(page.locator('.memorica-mobile-list').getByText('Library User')).toBeVisible();
  await expect(page.getByRole('button', { name: '更多操作' })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  const accountBox = await page.locator('.memorica-account-button').boundingBox();

  expect(hasHorizontalOverflow).toBe(false);
  expect(accountBox).toBeTruthy();
  expect(accountBox!.x + accountBox!.width).toBeLessThanOrEqual(390);
});

test('delete action is hidden until row more menu opens', async ({ page }) => {
  const rowDocument = documentItem('doc-row-actions', '项目复盘');

  await loginWithMockApi(page, { workspaceDocuments: [rowDocument], recentDocuments: [rowDocument] });

  await page.goto('/');

  await expect(page.locator('.memorica-desktop-table').getByText('项目复盘')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByRole('button', { name: '删除文档' })).not.toBeVisible();

  await page.getByRole('button', { name: '更多操作' }).click();

  await expect(page.getByRole('menuitem', { name: '删除' })).toBeVisible();
});
