# Version History Error State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make version history load failures visible and retryable instead of silently rendering an empty history list.

**Architecture:** Keep `VersionHistoryPage` as the owner of loading, error, and retry state. Use the existing API client error parser and Ant Design feedback components so the page matches the frontend UI direction without changing backend contracts.

**Tech Stack:** React 19, TypeScript, Vite, Ant Design 5, Playwright.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/version-history-permission.spec.ts`

- [x] **Step 1: Add a failing route-mocked test**

Add a test where `/documents/:id/versions` returns `503` for the initial load attempts and succeeds after clicking retry:

```ts
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
```

- [x] **Step 2: Run RED**

Run:

```bash
cd frontend
npm run test:e2e -- version-history-permission.spec.ts -g "version history load failure shows retry action" --workers=1
```

Expected before implementation: FAIL because the page swallows the request error and shows the empty state.

### Task 2: Version History Error UI

**Files:**
- Modify: `frontend/src/pages/VersionHistoryPage.tsx`

- [x] **Step 1: Add retryable load state**

Use `useCallback`, `apiErrorMessage`, `Alert`, `Button`, and `Spin`. Set `loadError` in the catch path, clear it before retrying, and expose a retry button.

- [x] **Step 2: Run GREEN**

Run the same focused Playwright command. Expected after implementation: PASS.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/src/pages/VersionHistoryPage.tsx`
- Verify: `frontend/e2e/version-history-permission.spec.ts`
- Verify: `docs/superpowers/plans/2026-06-14-version-history-error-state.md`

- [x] **Step 1: Run related checks**

```bash
cd frontend && npm run test:e2e -- version-history-permission.spec.ts --workers=1
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
git diff --check
```

Verification results:

- Red path confirmed: the page had no `memorica-version-history-error` element before implementation.
- Focused green path: retryable load failure test passed.
- Related mocked regression: `version-history-permission.spec.ts` passed, 3 tests.
- `npm run lint`: passed.
- `npm run build`: passed with the existing Vite large chunk warning.
- `npm run antd:doctor`: passed, 25 checks.
- `npm run antd:lint`: passed, 0 issues.
- `git diff --check`: passed.

- [ ] **Step 2: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-14-version-history-error-state.md frontend/e2e/version-history-permission.spec.ts frontend/src/pages/VersionHistoryPage.tsx
git commit -m "feat: show version history load errors"
git push
```
