import { expect, test, type Page } from '@playwright/test';
import {
  createDocument,
  expectBackendReady,
  expectLatestVersionContains,
  expectLatestVersionNotContains,
  generateAI,
  getDocument,
  getFileInfo,
  getLatestVersionContent,
  grantDocumentAccess,
  loginByStorage,
  registerTestUser,
  uniqueName,
} from './helpers/api';

async function openEditorForDocument(page: Page, documentId: string) {
  await page.goto(`/doc/${documentId}`);
  await expect(page.locator('.memorica-editor-shell')).toBeVisible();
  await expect(page.locator('.notion-editor')).toBeVisible();
}

async function waitForCollaboration(page: Page) {
  await expect(page.locator('.memorica-editor-collab-dot')).toContainText('协作中', { timeout: 15_000 });
}

async function openDrawioDialog(page: Page) {
  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
}

async function simulateDrawioExport(page: Page, marker: string) {
  await page.evaluate((value) => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    const xml = `<mxfile><diagram name="Page-1">${value}</diagram></mxfile>`;
    const data = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" rx="10" fill="#eef2ff"/><text x="28" y="84" fill="#2563eb">${value}</text></svg>`;
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ event: 'export', xml, data }),
      source: iframe.contentWindow,
    }));
  }, marker);
  await expect(page.locator('.memorica-diagram-node')).toBeVisible();
}

test.beforeAll(async ({ request }) => {
  await expectBackendReady(request);
});

test('editor saves content, creates a version, and restores after reload', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'save');
  const document = await createDocument(request, auth, uniqueName('保存验证'));
  const content = `保存回归 ${uniqueName('text')}`;

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(content);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('正在保存');
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });
  await expectLatestVersionContains(request, auth, document.id, content);

  await page.reload();
  await expect(page.locator('.notion-editor')).toContainText(content, { timeout: 12_000 });
});

test('local draft survives a failed version save and can be recovered after reload', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'draft');
  const document = await createDocument(request, auth, uniqueName('草稿恢复'));
  const content = `失败恢复 ${uniqueName('draft-text')}`;
  let failVersionSaves = true;

  await page.route('**/api/v1/documents/*/versions', async (route) => {
    if (route.request().method() === 'POST' && failVersionSaves) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'TEST_SAVE_FAILURE' }),
      });
      return;
    }
    await route.continue();
  });

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(content);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('保存失败', { timeout: 12_000 });

  await page.reload();
  await expect(page.locator('.memorica-editor-draft-banner')).toBeVisible({ timeout: 12_000 });
  failVersionSaves = false;
  await page.locator('.memorica-editor-draft-banner').getByRole('button', { name: '恢复' }).click();
  await expect(page.locator('.notion-editor')).toContainText(content, { timeout: 12_000 });
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });
  await expectLatestVersionContains(request, auth, document.id, content);
});

test('viewer can open a shared document but cannot edit or invoke AI', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'owner');
  const viewer = await registerTestUser(request, 'viewer');
  const document = await createDocument(request, owner, uniqueName('只读验证'));

  await grantDocumentAccess(request, owner, document.id, viewer.user.username, 'viewer');
  await expect(await getDocument(request, viewer, document.id)).toMatchObject({ canWrite: false, canManage: false });

  await loginByStorage(page, viewer);
  await openEditorForDocument(page, document.id);

  await expect(page.locator('.memorica-editor-save-status')).toContainText('只读');
  await expect(page.locator('.notion-editor')).toHaveAttribute('contenteditable', 'false');
  await expect(page.locator('button[title="AI 助手"]')).toBeDisabled();
});

test('shared documents tab shows documents explicitly shared with the current user', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'shareowner');
  const viewer = await registerTestUser(request, 'shareviewer');
  const sharedTitle = uniqueName('共享文档');
  const privateTitle = uniqueName('我的私有文档');
  const shared = await createDocument(request, owner, sharedTitle);
  await createDocument(request, viewer, privateTitle);

  await grantDocumentAccess(request, owner, shared.id, viewer.user.username, 'viewer');

  await loginByStorage(page, viewer);
  await page.goto('/');
  await page.getByRole('button', { name: '与我共享' }).click();

  await expect(page.getByText(sharedTitle)).toBeVisible({ timeout: 12_000 });
  await expect(page.getByText(privateTitle)).not.toBeVisible();
});

test('drawio diagram inserts into the editor and persists in version content', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'diagram');
  const document = await createDocument(request, auth, uniqueName('图示验证'));
  const marker = uniqueName('diagram-marker');

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await openDrawioDialog(page);
  await simulateDrawioExport(page, marker);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });
  await expectLatestVersionContains(request, auth, document.id, marker);
  await expectLatestVersionContains(request, auth, document.id, 'diagram');
});

test('version history can restore an older version into the editor', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'restore');
  const document = await createDocument(request, auth, uniqueName('恢复验证'));
  const firstText = `第一版 ${uniqueName('restore-a')}`;
  const secondText = `第二版 ${uniqueName('restore-b')}`;

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(firstText);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });
  await expectLatestVersionContains(request, auth, document.id, firstText);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(` ${secondText}`);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });
  await expectLatestVersionContains(request, auth, document.id, secondText);

  await page.goto(`/doc/${document.id}/versions`);
  await page.getByRole('button', { name: /版本 1/ }).click();
  await page.getByRole('button', { name: '恢复此版本' }).click();

  await expect(page.locator('.notion-editor')).toContainText(firstText, { timeout: 15_000 });
  await expect(page.locator('.notion-editor')).not.toContainText(secondText);
  await expectLatestVersionContains(request, auth, document.id, firstText);
  await expectLatestVersionNotContains(request, auth, document.id, secondText);
});

test('uploaded attachment persists and follows document sharing permissions', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'fileowner');
  const viewer = await registerTestUser(request, 'fileviewer');
  const document = await createDocument(request, owner, uniqueName('附件验证'));
  const fileName = `${uniqueName('sample')}.pdf`;

  await loginByStorage(page, owner);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
  });
  await expect(page.locator('.memorica-attachment-node')).toContainText(fileName, { timeout: 15_000 });
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });
  await expectLatestVersionContains(request, owner, document.id, fileName);

  const latest = await getLatestVersionContent(request, owner, document.id);
  const objectName = JSON.parse(latest).content
    .flatMap((node: { type?: string; attrs?: { objectName?: string } }) => node.type === 'attachment' ? [node.attrs?.objectName] : [])
    .find(Boolean);
  expect(objectName).toBeTruthy();

  await grantDocumentAccess(request, owner, document.id, viewer.user.username, 'viewer');
  const fileInfo = await getFileInfo(request, viewer, objectName);
  expect(fileInfo.originalName).toBe(fileName);
  expect(fileInfo.url).toContain(objectName);
});

test('AI provider can generate real content when enabled', async ({ request }) => {
  test.skip(process.env.E2E_RUN_AI !== 'true', 'Set E2E_RUN_AI=true to run the provider-backed AI check.');

  const auth = await registerTestUser(request, 'ai');
  const result = await generateAI(request, auth, 'Memorica 是一个多人协作在线文档产品。请用一句话总结。');

  expect(result.provider).toBe('deepseek');
  expect(result.text.trim().length).toBeGreaterThan(0);
});
