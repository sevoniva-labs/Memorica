# Draw.io Init Timeout Reload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Draw.io iframe initialization failures visible and recoverable instead of leaving users stuck on an endless loading state.

**Architecture:** Keep the protocol state machine in `DrawioDialog`. Add a dedicated `initTimeout` state driven by a short initialization timer, clear it when `init` arrives, and remount the iframe when the user clicks the reload action.

**Tech Stack:** React 19, TypeScript, Ant Design 5 Modal/Button, @ant-design/icons, Playwright route-mocked E2E.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/diagram-download.spec.ts`

- [x] **Step 1: Add a failing init-timeout reload test**

Add this route-mocked Playwright test:

```ts
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
```

Expected before implementation: FAIL because the dialog remains at `图示编辑器加载中` and has no `重新加载` action.

- [x] **Step 2: Run RED**

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "init timeout" --workers=1
```

Result before implementation: FAIL because the status stayed at `图示编辑器加载中` and no `重新加载` action existed.

### Task 2: Dialog State Machine

**Files:**
- Modify: `frontend/src/components/DrawioDialog.tsx`

- [x] **Step 1: Add init timeout state**

Extend the state type and messages:

```ts
type DrawioState = 'loading' | 'ready' | 'saving' | 'timeout' | 'error' | 'canceling' | 'initTimeout'
```

```ts
initTimeout: '图示编辑器加载超时，请重新加载',
```

- [x] **Step 2: Track initialization timeout and reload key**

Add refs/state:

```ts
const initTimerRef = useRef<number | null>(null)
const [frameNonce, setFrameNonce] = useState(0)
```

Add `clearInitTimer` using the same pattern as `clearSaveTimer`.

- [x] **Step 3: Start and clear the init timer**

When the dialog opens, start a 15s init timer. Clear it on cleanup and when `init` arrives:

```ts
clearInitTimer()
initTimerRef.current = window.setTimeout(() => {
  if (stateRef.current === 'loading') {
    setState('initTimeout')
  }
}, 15_000)
```

- [x] **Step 4: Add reload action**

Add:

```ts
const reloadDrawio = useCallback(() => {
  clearSaveTimer()
  clearCancelTimer()
  setState('loading')
  setFrameNonce((value) => value + 1)
  scheduleInitTimeout()
}, [clearCancelTimer, clearSaveTimer, scheduleInitTimeout])
```

- [x] **Step 5: Render reload button state**

Derive:

```ts
const initTimedOut = state === 'initTimeout'
```

Use it in the primary button:

```tsx
icon={saving ? <LoadingOutlined spin /> : (retryable || initTimedOut) ? <ReloadOutlined /> : <CheckOutlined />}
onClick={initTimedOut ? reloadDrawio : handleSave}
{initTimedOut ? '重新加载' : retryable ? '重试保存' : '保存图示'}
```

Include `frameNonce` in the iframe key so reload remounts the embedded editor.

- [x] **Step 6: Run GREEN**

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "init timeout" --workers=1
```

Result after implementation: PASS, 1/1 focused test passed.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/diagram-download.spec.ts`
- Verify: `frontend/src/components/DrawioDialog.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-drawio-init-timeout-reload.md`

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
- `npm run test:e2e -- diagram-download.spec.ts --workers=1`: PASS, 7/7 tests.
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
git add docs/superpowers/plans/2026-06-14-drawio-init-timeout-reload.md frontend/e2e/diagram-download.spec.ts frontend/src/components/DrawioDialog.tsx
git commit -m "feat: reload drawio after init timeout"
git push origin feat/pre-release-hardening
```
