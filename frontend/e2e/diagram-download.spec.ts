import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 2101,
  username: 'download_user',
  displayName: 'Download User',
  email: 'download@example.test',
  color: '#245bdb',
};

const document = {
  id: 'download-doc',
  title: '下载验证文档',
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

async function openEditor(page: Page) {
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
}

async function insertDiagram(page: Page, title: string) {
  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
  await page.getByTestId('memorica-diagram-title').fill(title);
  await page.getByTestId('memorica-diagram-template-blank').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({
        event: 'export',
        xml: '<mxfile><diagram name="Page-1">download</diagram></mxfile>',
        data: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><text x="20" y="80">download</text></svg>',
      }),
      source: iframe.contentWindow,
    }));
  });
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible();
}

async function insertDiagramWithoutPreview(page: Page, title: string) {
  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
  await page.getByTestId('memorica-diagram-title').fill(title);
  await page.getByTestId('memorica-diagram-template-blank').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({
        event: 'export',
        xml: '<mxfile><diagram name="Page-1">recoverable xml</diagram></mxfile>',
        data: '',
      }),
      source: iframe.contentWindow,
    }));
  });
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible();
}

async function openDrawioFromBlankTemplate(page: Page, title = '临时图示') {
  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
  await page.getByTestId('memorica-diagram-title').fill(title);
  await page.getByTestId('memorica-diagram-template-blank').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
}

test('diagram svg download falls back to a safe filename when the title is invalid', async ({ page }) => {
  await openEditor(page);
  await insertDiagram(page, '///');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('memorica-diagram-action-download').click(),
  ]);

  expect(download.suggestedFilename()).toBe('diagram.svg');
});

test('diagram without svg preview still exposes XML edit fallback', async ({ page }) => {
  await openEditor(page);
  await insertDiagramWithoutPreview(page, '可恢复图示');

  const diagram = page.getByTestId('memorica-diagram-node');
  await expect(diagram.getByTestId('memorica-diagram-preview-fallback')).toContainText('预览不可用');
  await expect(diagram.getByTestId('memorica-diagram-action-download')).toBeDisabled();

  await diagram.getByTestId('memorica-diagram-action-edit').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
});

test('drawio cancel shows canceling state and does not insert a diagram', async ({ page }) => {
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);

  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('正在取消图示');
  await expect(page.locator('.memorica-drawio-frame')).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('memorica-diagram-node')).toHaveCount(0);

  await openDrawioFromBlankTemplate(page, '再次打开');
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('图示编辑器加载中');
});

test('drawio exit event closes without inserting a diagram', async ({ page }) => {
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);

  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ event: 'exit' }),
      source: iframe.contentWindow,
    }));
  });

  await expect(page.getByTestId('memorica-drawio-status')).toContainText('正在取消图示');
  await expect(page.locator('.memorica-drawio-frame')).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('memorica-diagram-node')).toHaveCount(0);
});
