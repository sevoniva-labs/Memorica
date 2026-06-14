import { expect, test, type Page } from '@playwright/test';
import {
  createDocument,
  expectBackendReady,
  expectLatestVersionContains,
  expectLatestVersionNotContains,
  generateAI,
  getDocument,
  getFileInfo,
  getVersion,
  getLatestVersionContent,
  grantDocumentAccess,
  listVersions,
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
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
  await page.getByTestId('memorica-diagram-template-blank').click();
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

async function currentDocumentId(page: Page) {
  const match = page.url().match(/\/doc\/([^/?#]+)/);
  expect(match?.[1], `Expected editor URL to contain a document id, got ${page.url()}`).toBeTruthy();
  return match![1];
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

  await page.locator('button[title="更多"]').click();
  await expect(page.getByText('插入图示')).not.toBeVisible();
  await expect(page.getByText('上传图片')).not.toBeVisible();
  await expect(page.getByText('上传附件')).not.toBeVisible();
  await expect(page.getByText('切换为富文本')).not.toBeVisible();
});

test('readonly viewer ignores restore deep links', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'rdlown');
  const viewer = await registerTestUser(request, 'rdlview');
  const document = await createDocument(request, owner, uniqueName('只读恢复深链'));
  const firstText = `只读恢复正文 ${uniqueName('restore-deeplink')}`;

  await loginByStorage(page, owner);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(firstText);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });
  await expectLatestVersionContains(request, owner, document.id, firstText);

  const versions = await listVersions(request, owner, document.id);
  expect(versions.length).toBeGreaterThan(0);
  const versionId = versions[0].id;

  await grantDocumentAccess(request, owner, document.id, viewer.user.username, 'viewer');

  let versionDetailRequests = 0;
  await page.route(`**/api/v1/documents/versions/${versionId}`, async (route) => {
    versionDetailRequests += 1;
    await route.continue();
  });

  await loginByStorage(page, viewer);
  await page.goto(`/doc/${document.id}?restoreVersion=${versionId}`);
  await expect(page.locator('.memorica-editor-shell')).toBeVisible();
  await waitForCollaboration(page);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('只读', { timeout: 12_000 });
  await page.waitForTimeout(1_000);

  expect(versionDetailRequests).toBe(0);
  await expect(page).toHaveURL(new RegExp(`/doc/${document.id}$`));
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

test('new user can complete the collaborative document demo path', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'demopath');
  const viewer = await registerTestUser(request, 'demoviewer');
  const title = uniqueName('演示闭环');
  const bodyText = `主路径正文 ${uniqueName('body')}`;
  const diagramMarker = uniqueName('main-diagram');
  const fileName = `${uniqueName('demo-file')}.pdf`;

  await loginByStorage(page, owner);
  await page.goto('/');
  await page.getByTestId('memorica-create-document').click();
  await expect(page.locator('.memorica-editor-shell')).toBeVisible({ timeout: 12_000 });
  await page.locator('.memorica-editor-title-input').fill(title);
  await waitForCollaboration(page);

  await page.locator('.notion-editor').click();
  await page.keyboard.type(bodyText);

  await openDrawioDialog(page);
  await simulateDrawioExport(page, diagramMarker);

  await page.setInputFiles('[data-testid="memorica-attachment-upload"]', {
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
  });

  const documentId = await currentDocumentId(page);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 15_000 });
  await expectLatestVersionContains(request, owner, documentId, bodyText);
  await expectLatestVersionContains(request, owner, documentId, diagramMarker);
  await expectLatestVersionContains(request, owner, documentId, fileName);

  await page.getByRole('button', { name: '分享' }).click();
  await page.getByTestId('memorica-share-username').fill(viewer.user.username);
  await page.getByTestId('memorica-share-add-member').click();
  await expect(page.getByTestId('memorica-share-document-members')).toContainText(viewer.user.username, { timeout: 12_000 });

  await loginByStorage(page, viewer);
  await page.goto('/');
  await page.getByRole('button', { name: '与我共享' }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 12_000 });
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

test('drawio template picker inserts a titled flowchart diagram', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'flowchart');
  const document = await createDocument(request, auth, uniqueName('图示模板验证'));
  const title = `流程图 ${uniqueName('diagram-title')}`;
  const marker = uniqueName('flowchart-marker');

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
  await page.getByTestId('memorica-diagram-title').fill(title);
  await page.getByTestId('memorica-diagram-template-flowchart').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });

  await simulateDrawioExport(page, marker);
  await expect(page.getByTestId('memorica-diagram-node')).toContainText(title);
  await expectLatestVersionContains(request, auth, document.id, title);
  await expectLatestVersionContains(request, auth, document.id, marker);
});

test('drawio save timeout keeps the dialog open and allows retry', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'diatime');
  const document = await createDocument(request, auth, uniqueName('图示超时验证'));
  const marker = uniqueName('retry-marker');

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await page.getByTestId('memorica-diagram-template-blank').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: '保存图示' }).click();
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('保存没有响应', { timeout: 13_000 });
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible();

  await simulateDrawioExport(page, marker);
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible();
  await expectLatestVersionContains(request, auth, document.id, marker);
});

test('diagram block can be renamed duplicated and deleted', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'diaact');
  const document = await createDocument(request, auth, uniqueName('图示操作验证'));
  const marker = uniqueName('action-marker');
  const renamed = `重命名图示 ${uniqueName('renamed')}`;

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await openDrawioDialog(page);
  await simulateDrawioExport(page, marker);

  const firstDiagram = page.getByTestId('memorica-diagram-node').first();
  await firstDiagram.getByTestId('memorica-diagram-action-rename').click();
  await page.getByTestId('memorica-diagram-rename-input').fill(renamed);
  await page.getByRole('button', { name: '保存名称' }).click();
  await expect(firstDiagram).toContainText(renamed);

  await firstDiagram.getByTestId('memorica-diagram-action-duplicate').click();
  await expect(page.getByTestId('memorica-diagram-node')).toHaveCount(2);

  await page.getByTestId('memorica-diagram-node').first().getByTestId('memorica-diagram-action-delete').click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByTestId('memorica-diagram-node')).toHaveCount(1);
  await expectLatestVersionContains(request, auth, document.id, renamed);
});

test('viewer cannot mutate diagram blocks', async ({ page, request }) => {
  const owner = await registerTestUser(request, 'diaown');
  const viewer = await registerTestUser(request, 'diaview');
  const document = await createDocument(request, owner, uniqueName('图示只读验证'));
  const marker = uniqueName('readonly-diagram');

  await loginByStorage(page, owner);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);
  await openDrawioDialog(page);
  await simulateDrawioExport(page, marker);
  await expectLatestVersionContains(request, owner, document.id, marker);
  await grantDocumentAccess(request, owner, document.id, viewer.user.username, 'viewer');

  await loginByStorage(page, viewer);
  await openEditorForDocument(page, document.id);
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible({ timeout: 12_000 });
  await expect(page.getByTestId('memorica-diagram-action-download')).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-edit')).not.toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-rename')).not.toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-duplicate')).not.toBeVisible();
  await expect(page.getByTestId('memorica-diagram-action-delete')).not.toBeVisible();
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

test('version restore failure shows a specific editor status', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'restfail');
  const document = await createDocument(request, auth, uniqueName('恢复失败验证'));

  await loginByStorage(page, auth);
  await page.goto(`/doc/${document.id}?restoreVersion=999999999`);
  await expect(page.locator('.memorica-editor-shell')).toBeVisible();
  await waitForCollaboration(page);

  await expect(page.locator('.memorica-editor-save-status')).toContainText('版本恢复失败', { timeout: 12_000 });
  await expect(page).toHaveURL(new RegExp(`/doc/${document.id}$`));
});

test('restored diagram version remains editable', async ({ page, request }) => {
  const auth = await registerTestUser(request, 'diarest');
  const document = await createDocument(request, auth, uniqueName('图示恢复验证'));
  const firstMarker = uniqueName('diagram-first');
  const restoredMarker = uniqueName('diagram-restored-edit');

  await loginByStorage(page, auth);
  await openEditorForDocument(page, document.id);
  await waitForCollaboration(page);

  await openDrawioDialog(page);
  await simulateDrawioExport(page, firstMarker);
  await expectLatestVersionContains(request, auth, document.id, firstMarker);
  const versionsWithDiagram = await listVersions(request, auth, document.id);
  let diagramVersion: Awaited<ReturnType<typeof listVersions>>[number] | undefined;
  for (const version of versionsWithDiagram) {
    const detail = await getVersion(request, auth, version.id);
    if (detail.contentJson.includes(firstMarker)) {
      diagramVersion = version;
      break;
    }
  }
  expect(diagramVersion, 'Expected to find the version containing the diagram marker').toBeTruthy();

  await page.locator('.notion-editor').click();
  await page.keyboard.type(` ${uniqueName('later-text')}`);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('已保存', { timeout: 12_000 });

  await page.goto(`/doc/${document.id}/versions`);
  await page.getByRole('button', { name: new RegExp(`版本 ${diagramVersion!.versionNumber}\\b`) }).click();
  await page.getByRole('button', { name: '恢复此版本' }).click();
  await expect(page.getByTestId('memorica-diagram-node')).toBeVisible({ timeout: 15_000 });

  await page.getByTestId('memorica-diagram-action-edit').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
  await simulateDrawioExport(page, restoredMarker);
  await expectLatestVersionContains(request, auth, document.id, restoredMarker);
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
  const document = await createDocument(request, auth, uniqueName('AI 验证'));
  const result = await generateAI(request, auth, document.id, 'Memorica 是一个多人协作在线文档产品。请用一句话总结。');

  expect(result.provider).toBe('deepseek');
  expect(result.text.trim().length).toBeGreaterThan(0);
});
