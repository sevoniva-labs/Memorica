import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 2101,
  username: 'download_user',
  displayName: 'Download User',
  email: 'download@example.test',
  color: '#245bdb',
};
const mockAccessToken = `e30.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url')}.sig`;
const mockRefreshToken = `e30.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url')}.sig`;

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
  await page.addInitScript(({ accessToken, refreshToken }) => {
    window.localStorage.setItem('accessToken', accessToken);
    window.localStorage.setItem('refreshToken', refreshToken);
  }, { accessToken: mockAccessToken, refreshToken: mockRefreshToken });
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

async function mockDrawioFrame(page: Page) {
  await page.addInitScript(() => {
    const win = window as Window & { __drawioHostMessages?: Array<Record<string, unknown>> };
    win.__drawioHostMessages = [];
    window.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        if (payload.event === 'memorica-test-host-message' && payload.payload) {
          win.__drawioHostMessages?.push(JSON.parse(payload.payload as string) as Record<string, unknown>);
        }
      } catch {
        return;
      }
    });
  });
  await page.route('**/embed.diagrams.net/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
        <script>
          window.addEventListener('message', function(event) {
            parent.postMessage(JSON.stringify({
              event: 'memorica-test-host-message',
              payload: event.data
            }), '*');
          });
          window.setTimeout(function() {
            parent.postMessage(JSON.stringify({ event: 'init' }), '*');
          }, 0);
        </script>`,
    });
  });
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

test('drawio save requests a direct svg export from the embedded editor', async ({ page }) => {
  await mockDrawioFrame(page);
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('可以开始编辑图示');

  await page.getByRole('button', { name: '保存图示' }).click();

  await expect
    .poll(
      async () => page.evaluate(() => (
        (window as Window & { __drawioHostMessages?: Array<Record<string, unknown>> }).__drawioHostMessages || []
      )),
      { timeout: 1_000 }
    )
    .toContainEqual(expect.objectContaining({ action: 'export', format: 'svg' }));
});

test('drawio save event without xml still requests an svg export', async ({ page }) => {
  await mockDrawioFrame(page);
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('可以开始编辑图示');

  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ event: 'save' }),
      source: iframe.contentWindow,
    }));
  });

  await expect(page.getByTestId('memorica-drawio-status')).toContainText('正在保存图示');
  await expect
    .poll(
      async () => page.evaluate(() => (
        (window as Window & { __drawioHostMessages?: Array<Record<string, unknown>> }).__drawioHostMessages || []
      )),
      { timeout: 1_000 }
    )
    .toContainEqual(expect.objectContaining({ action: 'export', format: 'svg' }));
});

test('drawio export error keeps the dialog open and does not insert a diagram', async ({ page }) => {
  await mockDrawioFrame(page);
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('可以开始编辑图示');

  await page.getByRole('button', { name: '保存图示' }).click();
  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ event: 'export', error: 'EXPORT_FAILED' }),
      source: iframe.contentWindow,
    }));
  });

  await expect(page.getByTestId('memorica-drawio-status')).toContainText('图示编辑器出现异常');
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible();
  await expect(page.getByRole('button', { name: '重试保存' })).toBeVisible();
  await expect(page.getByTestId('memorica-diagram-node')).toHaveCount(0);
});

test('drawio save stays disabled until the embedded editor is ready', async ({ page }) => {
  await openEditor(page);
  await page.route('**/embed.diagrams.net/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>drawio loading</title>',
    });
  });

  await openDrawioFromBlankTemplate(page);

  await expect(page.getByTestId('memorica-drawio-status')).toContainText('图示编辑器加载中');
  await expect(page.getByRole('button', { name: '保存图示' })).toBeDisabled();
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

test('drawio save timeout shows an explicit retry action', async ({ page }) => {
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);
  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ event: 'init' }),
      source: iframe.contentWindow,
    }));
  });
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('可以开始编辑图示');

  await page.clock.install();
  await page.getByRole('button', { name: '保存图示' }).click();
  await page.clock.fastForward(12_100);
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('保存没有响应');
  await expect(page.getByRole('button', { name: '重试保存' })).toBeVisible();

  await page.getByRole('button', { name: '重试保存' }).click();
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('正在保存图示');
});

test('drawio error event shows retry action and remains recoverable', async ({ page }) => {
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);

  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ event: 'error' }),
      source: iframe.contentWindow,
    }));
  });

  await expect(page.getByTestId('memorica-drawio-status')).toContainText('图示编辑器出现异常');
  await expect(page.getByRole('button', { name: '重试保存' })).toBeVisible();

  await page.getByRole('button', { name: '重试保存' }).click();
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('正在保存图示');
});

test('drawio init timeout offers reload and accepts a later init event', async ({ page }) => {
  await openEditor(page);
  await page.route('**/embed.diagrams.net/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>drawio offline</title>',
    });
  });
  await page.clock.install();
  await openDrawioFromBlankTemplate(page);

  await page.clock.fastForward(15_100);
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('图示编辑器加载超时');
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();

  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('图示编辑器加载中');

  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('.memorica-drawio-frame');
    if (!iframe?.contentWindow) throw new Error('drawio iframe not found');
    window.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({ event: 'init' }),
      source: iframe.contentWindow,
    }));
  });

  await expect(page.getByTestId('memorica-drawio-status')).toContainText('可以开始编辑图示');
});
