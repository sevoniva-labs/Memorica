# Draw.io Cancel Exit State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Draw.io cancel and exit paths explicit, non-mutating, and reset-safe when the dialog is reopened.

**Architecture:** Keep the protocol state machine in `DrawioDialog` because it owns Draw.io messages. Add a short `canceling` state before closing, disable footer actions while canceling, and conditionally mount `DrawioDialog` from `CollabEditor` so each new dialog session starts from the initial `loading` state without effect-driven state resets.

**Tech Stack:** React 19, TypeScript, Ant Design Modal/Button, Playwright route-mocked E2E.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/diagram-download.spec.ts`

- [x] **Step 1: Add a helper that opens Draw.io without saving**

Add:

```ts
async function openDrawioFromBlankTemplate(page: Page, title = '临时图示') {
  await page.locator('button[title="更多"]').click();
  await page.getByText('插入图示').click();
  await expect(page.getByTestId('memorica-diagram-template-picker')).toBeVisible();
  await page.getByTestId('memorica-diagram-title').fill(title);
  await page.getByTestId('memorica-diagram-template-blank').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
}
```

- [x] **Step 2: Add a failing cancel state test**

Add:

```ts
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
```

- [x] **Step 3: Add a failing exit event test**

Add:

```ts
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
```

- [x] **Step 4: Run RED**

Run:

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "drawio cancel|drawio exit" --workers=1
```

Result before implementation: FAIL because the dialog kept `图示编辑器加载中` and never rendered `正在取消图示`.

### Task 2: Dialog State Machine

**Files:**
- Modify: `frontend/src/components/DrawioDialog.tsx`
- Modify: `frontend/src/components/CollabEditor.tsx`

- [x] **Step 1: Add canceling state**

Extend the type and messages:

```ts
type DrawioState = 'loading' | 'ready' | 'saving' | 'timeout' | 'error' | 'canceling'
```

```ts
canceling: '正在取消图示',
```

- [x] **Step 2: Reset state on every open**

Conditionally mount the dialog from `CollabEditor` while `drawioOpen` is true:

```tsx
{drawioOpen && (
  <DrawioDialog
    open={drawioOpen}
    initialXml={activeDiagram?.attrs.xml || pendingDiagram?.xml}
    initialTitle={activeDiagram?.attrs.title || pendingDiagram?.title || '图示'}
    onCancel={closeDrawio}
    onSave={saveDiagram}
  />
)}
```

- [x] **Step 3: Use a shared cancel function**

Add:

```ts
const cancelDrawio = useCallback(() => {
  clearSaveTimer()
  setState('canceling')
  window.setTimeout(onCancel, 150)
}, [clearSaveTimer, onCancel])
```

Use `cancelDrawio` for the `exit` event, cancel button, and Modal `onCancel`.

- [x] **Step 4: Ignore protocol messages while canceling**

After entering `canceling`, ignore later Draw.io iframe messages so delayed `init`, `save`, or `export` events cannot overwrite the cancel state or persist a diagram.

- [x] **Step 5: Disable actions while canceling**

Add:

```ts
const canceling = state === 'canceling'
```

Disable both footer buttons when `canceling`.

- [x] **Step 6: Run GREEN**

Run:

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "drawio cancel|drawio exit" --workers=1
```

Result after implementation: PASS, 2/2 focused tests passed.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/diagram-download.spec.ts`
- Verify: `frontend/src/components/DrawioDialog.tsx`
- Verify: `frontend/src/components/CollabEditor.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-drawio-cancel-exit-state.md`

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
- `npm run test:e2e -- diagram-download.spec.ts --workers=1`: PASS, 4/4 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run antd:doctor`: PASS, 25 pass / 0 warn / 0 fail.
- `npm run antd:lint`: PASS, 0 issues.
- `git diff --check`: PASS.

- [ ] **Step 2: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-14-drawio-cancel-exit-state.md frontend/e2e/diagram-download.spec.ts frontend/src/components/DrawioDialog.tsx frontend/src/components/CollabEditor.tsx
git commit -m "feat: show drawio cancel state"
git push origin feat/pre-release-hardening
```
