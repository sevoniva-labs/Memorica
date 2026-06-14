import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 2401,
  username: 'version_permission_user',
  displayName: 'Version Permission User',
  email: 'version-permission@example.test',
  color: '#245bdb',
};

const document = {
  id: 'version-permission-doc',
  title: '版本权限文档',
  ownerName: user.displayName,
  workspaceId: 'workspace-main',
  itemType: 'document',
  wordCount: 3,
  charCount: 9,
  isPublic: false,
  isFavorite: false,
  canManage: false,
  createdAt: '2026-06-14T08:00:00.000Z',
  updatedAt: '2026-06-14T08:00:00.000Z',
};

const version = {
  id: 3101,
  versionNumber: 1,
  editorName: user.displayName,
  wordCount: 3,
  charCount: 9,
  createdAt: '2026-06-14T08:30:00.000Z',
};

async function openVersionHistory(page: Page, canWrite: boolean) {
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
  await page.route('**/api/v1/documents/recent**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });
  await page.route(`**/api/v1/documents/${document.id}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...document, canWrite } }),
    });
  });
  await page.route(`**/api/v1/documents/${document.id}/versions**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [version] } }),
    });
  });
  await page.route(`**/api/v1/documents/versions/${version.id}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ...version,
          contentJson: JSON.stringify({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: '历史版本正文' }] }],
          }),
          snapshotHtml: '<p>历史版本正文</p>',
        },
      }),
    });
  });

  await page.goto(`/doc/${document.id}/versions`);
  await expect(page.getByText('版本权限文档')).toBeVisible({ timeout: 12_000 });
}

test('readonly user can preview but cannot restore a version', async ({ page }) => {
  await openVersionHistory(page, false);

  await page.getByRole('button', { name: /版本 1/ }).click();

  await expect(page.getByText('历史版本正文')).toBeVisible();
  await expect(page.getByRole('button', { name: '恢复此版本' })).not.toBeVisible();
  await expect(page.getByTestId('memorica-version-restore-readonly')).toContainText('只读用户不能恢复版本');
});

test('editor can restore a selected version', async ({ page }) => {
  await openVersionHistory(page, true);

  await page.getByRole('button', { name: /版本 1/ }).click();

  await expect(page.getByRole('button', { name: '恢复此版本' })).toBeVisible();
});

test('version history load failure shows retry action', async ({ page }) => {
  let versionRequests = 0;
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
  await page.route('**/api/v1/documents/recent**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });
  await page.route(`**/api/v1/documents/${document.id}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...document, canWrite: true } }),
    });
  });
  await page.route(`**/api/v1/documents/${document.id}/versions**`, async (route) => {
    versionRequests += 1;
    if (versionRequests <= 2) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: '版本服务暂时不可用' }),
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [version] } }),
    });
  });

  await page.goto(`/doc/${document.id}/versions`);
  await expect(page.getByTestId('memorica-version-history-error')).toContainText('版本服务暂时不可用');
  const requestsBeforeRetry = versionRequests;
  await page.getByTestId('memorica-version-history-retry').click();
  await expect(page.getByRole('button', { name: /版本 1/ })).toBeVisible();
  expect(versionRequests).toBeGreaterThan(requestsBeforeRetry);
});
