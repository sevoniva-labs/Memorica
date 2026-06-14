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

type VersionDetailRoute = {
  status?: number;
  body?: unknown;
  delayMs?: number;
  text?: string;
  contentJson?: string;
  snapshotHtml?: string | null;
};

async function openVersionHistory(
  page: Page,
  canWrite: boolean,
  versions = [version],
  options: {
    versionDetailStatus?: number;
    versionDetailBody?: unknown;
    versionDetailDelayMs?: number;
    versionDetails?: Record<number, VersionDetailRoute>;
  } = {}
) {
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
      body: JSON.stringify({ data: { content: versions } }),
    });
  });
  await page.route('**/api/v1/documents/versions/*', async (route) => {
    const versionId = Number(new URL(route.request().url()).pathname.split('/').pop());
    const routeVersion = versions.find((item) => item.id === versionId) || version;
    const routeOptions = options.versionDetails?.[versionId] || {
      status: options.versionDetailStatus,
      body: options.versionDetailBody,
      delayMs: options.versionDetailDelayMs,
    };
    if (routeOptions.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, routeOptions.delayMs));
    }
    if (routeOptions.status) {
      await route.fulfill({
        status: routeOptions.status,
        contentType: 'application/json',
        body: JSON.stringify(routeOptions.body || { message: '版本详情加载失败' }),
      });
      return;
    }
    const bodyText = routeOptions.text || '历史版本正文';
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ...routeVersion,
          contentJson: routeOptions.contentJson ?? JSON.stringify({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: bodyText }] }],
          }),
          snapshotHtml: routeOptions.snapshotHtml === undefined ? `<p>${bodyText}</p>` : routeOptions.snapshotHtml,
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

test('version detail request shows a loading state before preview renders', async ({ page }) => {
  await openVersionHistory(page, true, [version], { versionDetailDelayMs: 600 });

  await page.getByRole('button', { name: /版本 1/ }).click();

  await expect(page.getByTestId('memorica-version-detail-loading')).toContainText('版本详情加载中');
  await expect(page.getByText('历史版本正文')).toBeVisible();
});

test('latest selected version wins when detail requests finish out of order', async ({ page }) => {
  const slowVersion = { ...version, id: 3101, versionNumber: 1, wordCount: 3 };
  const fastVersion = { ...version, id: 3102, versionNumber: 2, wordCount: 7 };

  await openVersionHistory(page, true, [fastVersion, slowVersion], {
    versionDetails: {
      [slowVersion.id]: { delayMs: 700, text: '慢请求旧版本正文' },
      [fastVersion.id]: { text: '快速新版本正文' },
    },
  });

  const slowResponse = page.waitForResponse((response) => response.url().endsWith(`/documents/versions/${slowVersion.id}`));
  const fastResponse = page.waitForResponse((response) => response.url().endsWith(`/documents/versions/${fastVersion.id}`));
  await page.getByRole('button', { name: /版本 1/ }).click();
  await expect(page.getByTestId('memorica-version-detail-loading')).toContainText('版本详情加载中');
  await page.getByRole('button', { name: /版本 2/ }).click();

  await fastResponse;
  await expect(page.getByText('快速新版本正文')).toBeVisible();
  await slowResponse;
  await expect(page.getByText('慢请求旧版本正文')).not.toBeVisible();
});

test('version detail load failure shows an inline error', async ({ page }) => {
  await openVersionHistory(page, true, [version], {
    versionDetailStatus: 503,
    versionDetailBody: { message: '版本详情暂时不可用' },
  });

  await page.getByRole('button', { name: /版本 1/ }).click();

  await expect(page.getByTestId('memorica-version-detail-error')).toContainText('版本详情暂时不可用');
  await expect(page.getByRole('button', { name: '恢复此版本' })).not.toBeVisible();
});

test('invalid raw version content shows a preview fallback instead of crashing', async ({ page }) => {
  await openVersionHistory(page, true, [version], {
    versionDetails: {
      [version.id]: {
        contentJson: '{not-json',
        snapshotHtml: null,
      },
    },
  });

  await page.getByRole('button', { name: /版本 1/ }).click();

  await expect(page.getByTestId('memorica-version-content-invalid')).toContainText('版本内容格式异常');
  await expect(page.getByRole('button', { name: '恢复此版本' })).toBeVisible();
});

test('version list shows word count changes between versions', async ({ page }) => {
  const firstVersion = { ...version, id: 3101, versionNumber: 1, wordCount: 3 };
  const secondVersion = { ...version, id: 3102, versionNumber: 2, wordCount: 12 };

  await openVersionHistory(page, true, [secondVersion, firstVersion]);

  await expect(page.getByTestId('memorica-version-word-delta-3102')).toContainText('+9 词');
  await expect(page.getByTestId('memorica-version-word-delta-3101')).toContainText('初始');
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
