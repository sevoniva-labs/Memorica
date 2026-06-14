import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 2201,
  username: 'upload_guard_user',
  displayName: 'Upload Guard User',
  email: 'upload-guard@example.test',
  color: '#245bdb',
};

const document = {
  id: 'upload-guard-doc',
  title: '上传限制验证文档',
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

test('unsupported attachment type is rejected before upload', async ({ page }) => {
  let uploadRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    uploadRequests += 1;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'UPLOAD_SHOULD_NOT_BE_CALLED' }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('plain text is not supported'),
  });

  await expect(page.getByTestId('memorica-upload-status')).toContainText('仅支持 JPG、PNG、GIF、WebP 图片或 PDF 文件');
  expect(uploadRequests).toBe(0);
});

test('oversized attachment is rejected before upload', async ({ page }) => {
  let uploadRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    uploadRequests += 1;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'UPLOAD_SHOULD_NOT_BE_CALLED' }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: 'too-large.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });

  await expect(page.getByTestId('memorica-upload-status')).toContainText('文件不能超过 10 MB');
  expect(uploadRequests).toBe(0);
});

test('attachment upload shows progress and success status', async ({ page }) => {
  let uploadRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    uploadRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          objectName: 'sample.pdf',
          url: 'https://example.test/sample.pdf',
          originalName: 'sample.pdf',
          contentType: 'application/pdf',
          sizeBytes: 128,
          documentId: document.id,
        },
      }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nsample\n%%EOF\n'),
  });

  await expect(page.getByTestId('memorica-upload-status')).toContainText('正在上传 sample.pdf');
  await expect(page.getByTestId('memorica-upload-status')).toContainText('文件已插入：sample.pdf');
  await expect(page.locator('.memorica-attachment-node')).toContainText('sample.pdf');
  expect(uploadRequests).toBe(1);
});

test('image upload shows success status and inserts an image node', async ({ page }) => {
  let uploadRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    uploadRequests += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          objectName: 'sample.png',
          url: 'https://example.test/sample.png',
          originalName: 'sample.png',
          contentType: 'image/png',
          sizeBytes: 96,
          documentId: document.id,
        },
      }),
    });
  });
  await page.route('**/api/v1/files/view/sample.png', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          objectName: 'sample.png',
          url: 'data:image/png;base64,iVBORw0KGgo=',
          originalName: 'sample.png',
          contentType: 'image/png',
          sizeBytes: 96,
          documentId: document.id,
        },
      }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-image-upload"]', {
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ]),
  });

  await expect(page.getByTestId('memorica-upload-status')).toContainText('文件已插入：sample.png');
  await expect(page.getByTestId('memorica-document-image-node')).toBeVisible();
  await expect(page.getByTestId('memorica-document-image-node').locator('img')).toHaveAttribute('alt', 'sample.png');
  expect(uploadRequests).toBe(1);
});

test('permission failure shows a stable upload failure status', async ({ page }) => {
  let uploadRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    uploadRequests += 1;
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ message: '无权向该文档上传文件' }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: 'private.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nprivate\n%%EOF\n'),
  });

  await expect(page.getByTestId('memorica-upload-status')).toContainText('权限不足：无权向该文档上传文件');
  await expect(page.locator('.memorica-attachment-node')).toHaveCount(0);
  expect(uploadRequests).toBe(1);
});

test('attachment open permission failure shows inline status', async ({ page }) => {
  let viewRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          objectName: 'private.pdf',
          url: 'https://example.test/private.pdf',
          originalName: 'private.pdf',
          contentType: 'application/pdf',
          sizeBytes: 128,
          documentId: document.id,
        },
      }),
    });
  });
  await page.route('**/api/v1/files/view/private.pdf', async (route) => {
    viewRequests += 1;
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ message: '无权访问该文件' }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: 'private.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nprivate\n%%EOF\n'),
  });

  const attachment = page.locator('.memorica-attachment-node');
  await expect(attachment).toContainText('private.pdf');
  const openButton = attachment.getByRole('button', { name: '打开' });
  await openButton.click();

  await expect(page.getByTestId('memorica-attachment-status')).toContainText('权限不足：无权访问该文件');
  await expect(openButton).toBeEnabled();
  expect(viewRequests).toBe(1);
});
