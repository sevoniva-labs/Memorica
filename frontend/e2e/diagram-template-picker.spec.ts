import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 2001,
  username: 'diagram_user',
  displayName: 'Diagram User',
  email: 'diagram@example.test',
  color: '#245bdb',
};

const document = {
  id: 'template-doc',
  title: '模板验证文档',
  ownerName: user.displayName,
  workspaceId: 'workspace-main',
  itemType: 'document',
  wordCount: 0,
  charCount: 0,
  isPublic: false,
  isFavorite: false,
  canWrite: true,
  canManage: true,
  createdAt: '2026-06-14T08:00:00.000Z',
  updatedAt: '2026-06-14T08:00:00.000Z',
};

async function openTemplatePicker(page: Page) {
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
      body: JSON.stringify({ data: document }),
    });
  });
  await page.route(`**/api/v1/documents/${document.id}/versions**`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: [] } }),
    });
  });

  await page.goto(`/doc/${document.id}`);
  await expect(page.locator('.memorica-editor-shell')).toBeVisible({ timeout: 12_000 });
  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
}

test('diagram template picker shows all required template types', async ({ page }) => {
  await openTemplatePicker(page);

  await expect(page.getByTestId('memorica-diagram-template-blank')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-flowchart')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-mindmap')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-sequence')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-architecture')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-swimlane')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-er')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-state')).toBeVisible();
});

test('diagram template picker supports search and category filtering', async ({ page }) => {
  await openTemplatePicker(page);

  await page.getByTestId('memorica-diagram-template-search').fill('ER');
  await expect(page.getByTestId('memorica-diagram-template-er')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-flowchart')).not.toBeVisible();

  await page.getByTestId('memorica-diagram-template-search').clear();
  await page.getByTestId('memorica-diagram-template-category').getByText('系统').click();
  await expect(page.getByTestId('memorica-diagram-template-architecture')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-er')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-flowchart')).not.toBeVisible();

  await page.getByTestId('memorica-diagram-template-category').getByText('基础').click();
  await expect(page.getByTestId('memorica-diagram-template-blank')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-template-flowchart')).not.toBeVisible();
});

test('diagram template picker remembers recently used templates', async ({ page }) => {
  await openTemplatePicker(page);

  await page.getByTestId('memorica-diagram-template-sequence').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: '取消' }).click();

  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();

  await expect(page.getByTestId('memorica-diagram-template-recent')).toContainText('时序图');
});
