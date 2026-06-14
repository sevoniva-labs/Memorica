# Readonly Restore Deeplink Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent readonly users from applying version restore deep links in the editor, even when they manually navigate to `/doc/:id?restoreVersion=...`.

**Architecture:** Keep restore permission enforcement in `CollabEditor`, next to the existing restore deep-link handler. Add a Playwright regression test to the existing editor suite using the real backend and Hocuspocus flow so the test covers authenticated readonly collaboration state, not only hidden UI.

**Tech Stack:** React 19, TypeScript, Vite, Ant Design 5, Playwright, Spring Boot API, Hocuspocus.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/editor-regression.spec.ts`
- Read: `frontend/e2e/helpers/api.ts`

- [ ] **Step 1: Import `listVersions`**

Add `listVersions` to the existing helper imports:

```ts
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
  listVersions,
  loginByStorage,
  registerTestUser,
  uniqueName,
} from './helpers/api';
```

- [ ] **Step 2: Write the failing readonly deep-link test**

Add this test near the existing readonly/version restore tests:

```ts
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
```

- [ ] **Step 3: Run the focused test to verify RED**

Run:

```bash
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e -- editor-regression.spec.ts -g "readonly viewer ignores restore deep links" --workers=1
```

Expected before implementation: FAIL because the readonly editor requests `/api/v1/documents/versions/:versionId`.

### Task 2: Editor Guard

**Files:**
- Modify: `frontend/src/components/CollabEditor.tsx`

- [ ] **Step 1: Add `canEdit` guard inside the restore deep-link effect**

Change the restore deep-link effect so readonly users mark the version as handled, remove the restore query, and return before calling `getVersion`.

```ts
  useEffect(() => {
    const versionId = Number(searchParams.get('restoreVersion'))
    if (!editor || !connected || !versionId || restoredVersionRef.current === versionId) return
    restoredVersionRef.current = versionId
    if (!canEdit) {
      window.history.replaceState(null, '', `/doc/${docId}`)
      return
    }
    getVersion(versionId)
      .then((version) => {
        editor.commands.setContent(JSON.parse(version.contentJson || '{}'))
        window.setTimeout(() => saveCurrentVersion('restore'), 300)
        window.history.replaceState(null, '', `/doc/${docId}`)
      })
      .catch(() => {
        setVersionSaveState('error')
      })
  }, [canEdit, connected, docId, editor, saveCurrentVersion, searchParams])
```

- [ ] **Step 2: Run the focused test to verify GREEN**

Run the same focused Playwright command. Expected after implementation: PASS.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/editor-regression.spec.ts`
- Verify: `frontend/src/components/CollabEditor.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-readonly-restore-deeplink.md`

- [ ] **Step 1: Run related checks**

Run:

```bash
cd frontend && npm run lint
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
git diff --check
```

- [ ] **Step 2: Commit and push**

Run:

```bash
git add docs/superpowers/plans/2026-06-14-readonly-restore-deeplink.md frontend/e2e/editor-regression.spec.ts frontend/src/components/CollabEditor.tsx
git commit -m "fix: ignore readonly restore deep links"
git push
```
