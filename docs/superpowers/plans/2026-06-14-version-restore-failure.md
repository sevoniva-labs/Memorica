# Version Restore Failure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a clear version-restore failure message in the editor when a restore deep link cannot load the requested version.

**Architecture:** Keep restore handling inside `CollabEditor`, where restore deep links are already consumed. Reuse the existing save status pill with a small dedicated `restoreError` state so automatic saves cannot immediately hide the restore failure. Clear the restore query parameter after a failed attempt so reloads do not repeat the same invalid restore.

**Tech Stack:** React 19, TypeScript, Tiptap, Ant Design 5, Playwright E2E.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/editor-regression.spec.ts`

- [x] **Step 1: Add a failing restore failure test**

Add this test near the existing version restore coverage:

```ts
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
```

- [x] **Step 2: Run RED**

Run:

```bash
cd frontend
npm run test:e2e -- editor-regression.spec.ts -g "version restore failure shows a specific editor status" --workers=1
```

Expected before implementation: FAIL because the editor only shows the generic `保存失败` status and keeps the restore query parameter.

### Task 2: Editor Restore Failure UI

**Files:**
- Modify: `frontend/src/components/CollabEditor.tsx`

- [x] **Step 1: Make save issue visible for errors**

Change `saveStateText` so error state includes the issue:

```ts
if (state === 'error') return issue ? `保存失败：${issue}` : '保存失败'
```

- [x] **Step 2: Set a specific restore failure issue and clear the URL**

Add a dedicated state:

```ts
const [restoreError, setRestoreError] = useState('')
```

Use it to drive the status pill:

```ts
const saveStatusState = restoreError ? 'error' : !canEdit ? 'readonly' : versionSaveState
const saveStatusLabel = restoreError || (!canEdit ? '只读' : saveStateText(versionSaveState, saveIssue))
```

In the restore deep-link catch path, use `apiErrorMessage`, set the restore issue, and clear the query string:

```ts
.catch((error) => {
  const issue = apiErrorMessage(error, '请返回历史版本后重试')
  setRestoreError(`版本恢复失败：${issue}`)
  setVersionSaveState('error')
  setSaveIssue(`版本恢复失败：${issue}`)
  window.history.replaceState(null, '', `/doc/${docId}`)
})
```

- [x] **Step 3: Run GREEN**

Run:

```bash
cd frontend
npm run test:e2e -- editor-regression.spec.ts -g "version restore failure shows a specific editor status" --workers=1
```

Expected after implementation: PASS.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/editor-regression.spec.ts`
- Verify: `frontend/src/components/CollabEditor.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-version-restore-failure.md`

- [x] **Step 1: Run related checks**

```bash
cd frontend && npm run test:e2e -- editor-regression.spec.ts -g "version restore failure|version history can restore|readonly viewer ignores restore" --workers=1
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
git diff --check
```

Verification results:

- First RED attempt exposed local service readiness: backend was not running at `127.0.0.1:8080`.
- After starting backend against Docker PostgreSQL on `localhost:55432` and Hocuspocus against the same database, RED was confirmed: the editor showed generic `保存失败` and then auto-save replaced it with `已保存`.
- Focused GREEN path: `version restore failure shows a specific editor status` passed.
- Restore regression group passed: readonly restore deep links, successful version restore, and restore failure, 3 tests.
- `npm run lint`: passed.
- `npm run build`: passed with the existing Vite large chunk warning.
- `npm run antd:doctor`: passed, 25 checks.
- `npm run antd:lint`: passed, 0 issues.
- `git diff --check`: passed.

- [ ] **Step 2: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-14-version-restore-failure.md frontend/e2e/editor-regression.spec.ts frontend/src/components/CollabEditor.tsx
git commit -m "fix: show version restore failures"
git push origin feat/pre-release-hardening
```
