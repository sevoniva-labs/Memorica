import { expect, test, type Page } from '@playwright/test';
import {
  expectBackendReady,
  findMyDocumentByTitle,
  getDocument,
  getVersion,
  listVersions,
  loginByStorage,
  loginExistingUser,
  type TestAuth,
} from './helpers/api';

const DEMO_USERNAME = process.env.E2E_DEMO_USERNAME || 'demo';
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || 'Memorica2026';
const DEMO_VIEWER_USERNAME = process.env.E2E_DEMO_VIEWER_USERNAME || 'demo_viewer';
const DEMO_VIEWER_PASSWORD = process.env.E2E_DEMO_VIEWER_PASSWORD || 'Memorica2026';
const DEMO_DOCUMENT_TITLE = process.env.E2E_DEMO_DOCUMENT_TITLE || 'Memorica 预发布演示文档';

async function openEditorForDocument(page: Page, documentId: string) {
  await page.goto(`/doc/${documentId}`);
  await expect(page.locator('.memorica-editor-shell')).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('.notion-editor')).toBeVisible();
}

async function findAssetVersion(
  request: Parameters<typeof listVersions>[0],
  auth: TestAuth,
  documentId: string
) {
  const versions = await listVersions(request, auth, documentId);
  expect(versions.length, 'Expected seeded demo document to have at least two versions').toBeGreaterThanOrEqual(2);

  for (const version of versions) {
    const detail = await getVersion(request, auth, version.id);
    if (
      detail.contentJson.includes('演示系统架构图')
      && detail.contentJson.includes('memorica-demo-brief.pdf')
      && detail.snapshotHtml?.includes('memorica-diagram-static')
      && detail.snapshotHtml?.includes('memorica-attachment-static')
      && detail.snapshotHtml?.includes('memorica-diagram-title')
      && detail.snapshotHtml?.includes('memorica-attachment-title')
      && detail.snapshotHtml?.includes('演示系统架构图')
      && detail.snapshotHtml?.includes('memorica-demo-brief.pdf')
    ) {
      return version;
    }
  }

  throw new Error('Expected seeded demo document to include an asset-rich version snapshot');
}

test.beforeAll(async ({ request }) => {
  await expectBackendReady(request);
});

test('seeded demo owner can preview the asset-rich version', async ({ page, request }) => {
  const owner = await loginExistingUser(request, DEMO_USERNAME, DEMO_PASSWORD);
  const document = await findMyDocumentByTitle(request, owner, DEMO_DOCUMENT_TITLE);
  const assetVersion = await findAssetVersion(request, owner, document.id);

  await loginByStorage(page, owner);
  await page.goto(`/doc/${document.id}/versions`);
  await page.getByRole('button', { name: new RegExp(`版本 ${assetVersion.versionNumber}\\b`) }).click();

  await expect(page.locator('.memorica-diagram-static')).toContainText('演示系统架构图');
  await expect(page.locator('.memorica-attachment-static')).toContainText('memorica-demo-brief.pdf');
  await expect(page.getByRole('button', { name: '恢复此版本' })).toBeVisible();
});

test('seeded demo viewer can open the shared document only in readonly mode', async ({ page, request }) => {
  const owner = await loginExistingUser(request, DEMO_USERNAME, DEMO_PASSWORD);
  const viewer = await loginExistingUser(request, DEMO_VIEWER_USERNAME, DEMO_VIEWER_PASSWORD);
  const document = await findMyDocumentByTitle(request, owner, DEMO_DOCUMENT_TITLE);
  const assetVersion = await findAssetVersion(request, owner, document.id);

  await expect(await getDocument(request, viewer, document.id)).toMatchObject({
    canWrite: false,
    canManage: false,
  });

  await loginByStorage(page, viewer);
  await openEditorForDocument(page, document.id);
  await expect(page.locator('.memorica-editor-save-status')).toContainText('只读');
  await expect(page.locator('.notion-editor')).toHaveAttribute('contenteditable', 'false');
  await expect(page.locator('button[title="AI 助手"]')).toBeDisabled();
  await expect(page.getByTestId('memorica-diagram-node').filter({ hasText: '演示系统架构图' }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('.memorica-attachment-node').filter({ hasText: 'memorica-demo-brief.pdf' }).first()).toBeVisible({
    timeout: 15_000,
  });

  await page.goto(`/doc/${document.id}/versions`);
  await page.getByRole('button', { name: new RegExp(`版本 ${assetVersion.versionNumber}\\b`) }).click();
  await expect(page.getByTestId('memorica-version-restore-readonly')).toContainText('只读用户不能恢复版本');
});
