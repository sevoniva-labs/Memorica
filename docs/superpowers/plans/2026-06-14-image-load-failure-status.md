# Image Load Failure Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uploaded image load/refresh failures visible inside the image node instead of producing an unhandled refresh failure or leaving a broken image.

**Architecture:** Keep the failure state local to `DocumentImage` because the failed object belongs to one embedded image. Reuse `apiErrorMessage` and the existing image empty-state styling, adding a stable status selector for E2E.

**Tech Stack:** React 19, TypeScript, TipTap NodeView, @ant-design/icons, Playwright route-mocked E2E.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/attachment-upload-guard.spec.ts`

- [x] **Step 1: Add a failing image refresh permission test**

Add this test after the image upload success test:

```ts
test('image load refresh permission failure shows inline status', async ({ page }) => {
  let viewRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          objectName: 'broken.png',
          url: 'https://example.test/broken.png',
          originalName: 'broken.png',
          contentType: 'image/png',
          sizeBytes: 96,
          documentId: document.id,
        },
      }),
    });
  });
  await page.route('**/api/v1/files/view/broken.png', async (route) => {
    viewRequests += 1;
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ message: '无权访问该图片' }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-image-upload"]', {
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });

  await expect(page.getByTestId('memorica-document-image-status')).toContainText('权限不足：无权访问该图片');
  expect(viewRequests).toBe(1);
});
```

Expected before implementation: FAIL because `DocumentImage` catches no refresh error and renders no `memorica-document-image-status`.

- [x] **Step 2: Run RED**

```bash
cd frontend
npm run test:e2e -- attachment-upload-guard.spec.ts -g "image load refresh" --workers=1
```

Result before implementation: FAIL because `memorica-document-image-status` did not exist, and the image refresh request produced an unhandled 403 rejection.

### Task 2: Image Node Failure State

**Files:**
- Modify: `frontend/src/extensions/DocumentImage.tsx`

- [x] **Step 1: Import `apiErrorMessage`**

Change:

```ts
import { getFileUrl } from '../api/client'
```

to:

```ts
import { apiErrorMessage, getFileUrl } from '../api/client'
```

- [x] **Step 2: Add local issue state and text mapping**

Add:

```ts
function imageFailureStatusText(message: string) {
  return message.includes('权限') || message.includes('无权')
    ? `权限不足：${message}`
    : `图片加载失败：${message}`
}
```

Inside the node view:

```ts
const [issue, setIssue] = useState('')
```

- [x] **Step 3: Catch refresh failures**

Update `refresh` to catch failures:

```ts
try {
  const fresh = await getFileUrl(attrs.objectName)
  if (fresh.url) {
    setIssue('')
    setSrc(fresh.url)
  }
} catch (error) {
  const message = apiErrorMessage(error, '图片加载失败，请稍后重试')
  setIssue(imageFailureStatusText(message))
  setSrc('')
} finally {
  setLoading(false)
}
```

- [x] **Step 4: Render stable inline status**

In the empty state, render:

```tsx
<span data-testid="memorica-document-image-status">{issue || '图片加载失败'}</span>
```

- [x] **Step 5: Run GREEN**

```bash
cd frontend
npm run test:e2e -- attachment-upload-guard.spec.ts -g "image load refresh" --workers=1
```

Result after implementation: PASS, 1/1 focused test passed.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/attachment-upload-guard.spec.ts`
- Verify: `frontend/src/extensions/DocumentImage.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-image-load-failure-status.md`

- [x] **Step 1: Run related checks**

```bash
cd frontend && npm run test:e2e -- attachment-upload-guard.spec.ts --workers=1
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
git diff --check
```

Results:
- `npm run test:e2e -- attachment-upload-guard.spec.ts --workers=1`: PASS, 7/7 tests.
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
git add docs/superpowers/plans/2026-06-14-image-load-failure-status.md frontend/e2e/attachment-upload-guard.spec.ts frontend/src/extensions/DocumentImage.tsx
git commit -m "feat: show image load failures"
git push origin feat/pre-release-hardening
```
