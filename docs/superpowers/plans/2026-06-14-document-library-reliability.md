# Document Library Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Memorica document library resilient to duplicate create actions and recoverable list loading failures.

**Architecture:** Keep `DocumentListPage.tsx` as the owner of document-library state for this slice. Add focused mutation/loading state and inline retry UI while preserving existing Ant Design ProTable layout and E2E selectors.

**Tech Stack:** React 19, TypeScript, Ant Design 5, Ant Design ProComponents, Playwright, Spring Boot API.

---

## File Structure

- Create `frontend/e2e/document-library.spec.ts`
  - Add route-mocked Playwright coverage for double-click create and inline retry after list load failure.
- Modify `frontend/src/pages/DocumentListPage.tsx`
  - Add `creatingDocument`, per-action pending ids, and `listError`.
  - Render Ant Design `Alert` with retry action when list loading fails.
  - Use `loading` and `disabled` on existing Ant Design buttons.
- Modify `frontend/src/index.css`
  - Add compact styling for the inline list error state if default Ant Design spacing is too loose.
- Modify `.gitignore` and `frontend/eslint.config.js`
  - Exclude Playwright report and test-result directories from git and lint scans.

## Task 1: Prevent Duplicate Document Creation

- [ ] **Step 1: Write the failing Playwright test**

Add this test to `frontend/e2e/document-library.spec.ts`:

```ts
test('double clicking new document creates only one document', async ({ page, request }) => {
  let createRequests = 0;

  await loginWithMockApi(page);
  await page.route('**/api/v1/documents', async (route) => {
    if (route.request().method() === 'POST') {
      createRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.continue();
  });

  await page.goto('/');
  const createButton = page.getByTestId('memorica-create-document');
  await expect(createButton).toBeVisible({ timeout: 12_000 });
  await createButton.dblclick();

  await expect(page).toHaveURL(/\/doc\/[^/]+/, { timeout: 15_000 });
  expect(createRequests).toBe(1);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run with the Playwright-managed Vite server:

```bash
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' \
npm run test:e2e -- document-library.spec.ts -g "double clicking new document" --workers=1
```

Expected before implementation: FAIL because `createRequests` is `2`.

- [ ] **Step 3: Implement the minimal guard**

In `frontend/src/pages/DocumentListPage.tsx`, add:

```ts
const [creatingDocument, setCreatingDocument] = useState(false)
```

Update `handleCreate`:

```ts
const handleCreate = async (title = '未命名文档') => {
  if (creatingDocument) return
  setCreatingDocument(true)
  try {
    const doc = await createDocument(title, activeWorkspaceId, canUseFolders ? currentParentId : undefined)
    navigate(`/doc/${doc.id}`)
  } catch {
    message.error('创建文档失败')
    setCreatingDocument(false)
  }
}
```

Pass `loading={creatingDocument}` and `disabled={creatingDocument}` to all create buttons and prevent quick-action buttons from firing while creating.

- [ ] **Step 4: Rerun the focused test**

Use the same Playwright command. Expected: PASS with one POST request.

## Task 2: Add Inline Retry For Document List Failures

- [ ] **Step 1: Write the failing Playwright test**

Add this test to `frontend/e2e/document-library.spec.ts` after the duplicate-create test:

```ts
test('document list load failure shows inline retry', async ({ page, request }) => {
  let sharedRequests = 0;

  await loginWithMockApi(page);
  await page.route('**/api/v1/documents/shared**', async (route) => {
    sharedRequests += 1;
    if (sharedRequests === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'TEST_LIST_FAILURE' }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await page.getByRole('button', { name: '与我共享' }).click();

  await expect(page.getByTestId('memorica-list-error')).toContainText('文档列表加载失败');
  await page.getByTestId('memorica-list-retry').click();

  await expect(page.getByTestId('memorica-list-error')).not.toBeVisible({ timeout: 12_000 });
  expect(sharedRequests).toBe(2);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' \
npm run test:e2e -- document-library.spec.ts -g "document list load failure" --workers=1
```

Expected before implementation: FAIL because `memorica-list-error` does not exist.

- [ ] **Step 3: Implement inline retry**

In `DocumentListPage.tsx`:

```ts
const [listError, setListError] = useState('')
```

Clear `listError` before each load. In load catch blocks, set:

```ts
setListError('文档列表加载失败，请检查网络后重试')
```

Render before `ProTable`:

```tsx
{listError && (
  <Alert
    data-testid="memorica-list-error"
    className="memorica-list-error"
    type="error"
    showIcon
    message={listError}
    action={
      <Button data-testid="memorica-list-retry" size="small" onClick={() => fetchDocuments()}>
        重试
      </Button>
    }
  />
)}
```

- [ ] **Step 4: Rerun the focused test**

Use the same Playwright command. Expected: PASS and `sharedRequests` equals `2`.

## Task 3: Verification And Commit

- [ ] **Step 1: Run frontend checks**

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
```

Expected: all exit `0`.

- [ ] **Step 2: Run relevant backend fast checks**

```bash
make backend-unit-test
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit and push**

```bash
git status --short --branch
git add .gitignore frontend/eslint.config.js frontend/e2e/document-library.spec.ts frontend/src/pages/DocumentListPage.tsx frontend/src/index.css docs/superpowers/plans/2026-06-14-document-library-reliability.md
git commit -m "feat: harden document library actions"
git push
```
