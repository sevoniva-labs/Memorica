import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 2301,
  username: 'share_entry_user',
  displayName: 'Share Entry User',
  email: 'share-entry@example.test',
  color: '#245bdb',
};

const mockAccessToken = 'e30.eyJleHAiOjQxMDI0NDQ4MDB9.mock';
const mockRefreshToken = 'mock-refresh-token';

const baseDocument = {
  id: 'share-entry-doc',
  title: '分享入口权限文档',
  ownerName: user.displayName,
  workspaceId: 'workspace-main',
  itemType: 'document',
  wordCount: 0,
  charCount: 0,
  isPublic: false,
  isFavorite: false,
  createdAt: '2026-06-14T08:00:00.000Z',
  updatedAt: '2026-06-14T08:00:00.000Z',
};

async function openEditor(page: Page, permissions: { canWrite: boolean; canManage: boolean }) {
  await page.addInitScript(() => {
    window.localStorage.setItem('accessToken', 'e30.eyJleHAiOjQxMDI0NDQ4MDB9.mock');
    window.localStorage.setItem('refreshToken', 'mock-refresh-token');
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: user }),
    });
  });
  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { accessToken: mockAccessToken, refreshToken: mockRefreshToken } }),
    });
  });
  await page.route('**/api/v1/documents/recent**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });
  await page.route(`**/api/v1/documents/${baseDocument.id}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { ...baseDocument, ...permissions } }),
    });
  });
  await page.route(`**/api/v1/documents/${baseDocument.id}/versions**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });

  await page.goto(`/doc/${baseDocument.id}`);
  await expect(page.locator('.memorica-editor-shell')).toBeVisible({ timeout: 12_000 });
}

test('non-manager editor cannot see share management entry', async ({ page }) => {
  await openEditor(page, { canWrite: true, canManage: false });

  await expect(page.locator('.memorica-editor-save-status')).not.toContainText('只读');
  await expect(page.getByRole('button', { name: '分享' })).not.toBeVisible();
});

test('document manager can see share management entry', async ({ page }) => {
  await openEditor(page, { canWrite: true, canManage: true });

  await expect(page.getByRole('button', { name: '分享' })).toBeVisible();
});
