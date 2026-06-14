# Draw.io Error Retry State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Draw.io error and retry paths explicit so failed save/export sessions stay recoverable and demo-friendly.

**Architecture:** Keep protocol handling inside `DrawioDialog`. Use the existing footer status area and Ant Design buttons, but make timeout/error states visible through both status text and the primary button label.

**Tech Stack:** React 19, TypeScript, Ant Design 5 Modal/Button, @ant-design/icons, Playwright route-mocked E2E.

---

### Task 1: Regression Tests

**Files:**
- Modify: `frontend/e2e/diagram-download.spec.ts`

- [x] **Step 1: Add a failing timeout retry-label test**

Add:

```ts
test('drawio save timeout shows an explicit retry action', async ({ page }) => {
  await openEditor(page);
  await openDrawioFromBlankTemplate(page);

  await page.clock.install();
  await page.getByRole('button', { name: '保存图示' }).click();
  await page.clock.fastForward(12_100);
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('保存没有响应');
  await expect(page.getByRole('button', { name: '重试保存' })).toBeVisible();

  await page.getByRole('button', { name: '重试保存' }).click();
  await expect(page.getByTestId('memorica-drawio-status')).toContainText('正在保存图示');
});
```

Expected before implementation: FAIL because the timeout state still renders the primary button as `保存图示`.

- [x] **Step 2: Add a failing Draw.io error event test**

Add:

```ts
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
```

Expected before implementation: FAIL because the `error` event is ignored.

- [x] **Step 3: Run RED**

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "retry action|error event" --workers=1
```

Result before implementation: FAIL. The timeout test could not find `重试保存`, and the error-event test stayed at the loading/ready status instead of `图示编辑器出现异常`.

### Task 2: Draw.io State Machine

**Files:**
- Modify: `frontend/src/components/DrawioDialog.tsx`

- [x] **Step 1: Import the retry icon**

Change:

```ts
import { CheckOutlined, CloseOutlined, LoadingOutlined } from '@ant-design/icons'
```

to:

```ts
import { CheckOutlined, CloseOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
```

- [x] **Step 2: Add retry state derivation**

Add:

```ts
const retryable = state === 'timeout' || state === 'error'
```

- [x] **Step 3: Handle Draw.io error events**

Before `exit` handling, add:

```ts
if (payload.event === 'error') {
  clearSaveTimer()
  setState('error')
  return
}
```

- [x] **Step 4: Make the primary button explicitly retryable**

Change the primary button icon and label to:

```tsx
icon={saving ? <LoadingOutlined spin /> : retryable ? <ReloadOutlined /> : <CheckOutlined />}
...
{retryable ? '重试保存' : '保存图示'}
```

- [x] **Step 5: Run GREEN**

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "retry action|error event" --workers=1
```

Result after implementation: PASS, 2/2 focused tests passed.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/diagram-download.spec.ts`
- Verify: `frontend/src/components/DrawioDialog.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-drawio-error-retry-state.md`

- [x] **Step 1: Run related checks**

```bash
cd frontend && npm run test:e2e -- diagram-download.spec.ts --workers=1
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
git diff --check
```

Results:
- `npm run test:e2e -- diagram-download.spec.ts --workers=1`: PASS, 6/6 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run antd:doctor`: PASS, 25 pass / 0 warn / 0 fail.
- `npm run antd:lint`: PASS, 0 issues.
- `git diff --check`: PASS.

- [x] **Step 2: Clean generated outputs**

```bash
rm -rf frontend/test-results frontend/playwright-report frontend/dist
```

- [ ] **Step 3: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-14-drawio-error-retry-state.md frontend/e2e/diagram-download.spec.ts frontend/src/components/DrawioDialog.tsx
git commit -m "feat: show drawio retry state"
git push origin feat/pre-release-hardening
```
