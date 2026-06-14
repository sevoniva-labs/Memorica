# Image Upload Success Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the image upload path inserts a document image node with stable E2E selectors, matching the existing PDF attachment upload coverage.

**Architecture:** Keep upload orchestration in `CollabEditor` unchanged. Add a stable test id to the existing `DocumentImage` node view and cover the route-mocked image upload success path in the existing upload guard spec.

**Tech Stack:** React 19, TypeScript, TipTap NodeView, Ant Design feedback already owned by `CollabEditor`, Playwright route-mocked E2E.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/attachment-upload-guard.spec.ts`

- [x] **Step 1: Add a failing image upload success test**

Add this test after the attachment upload success case:

```ts
test('image upload shows success status and inserts an image node', async ({ page }) => {
  let uploadRequests = 0;
  await openEditor(page);
  await page.route('**/api/v1/files/upload', async (route) => {
    uploadRequests += 1;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          objectName: 'sample.png',
          url: 'https://example.test/sample.png',
          originalName: 'sample.png',
          contentType: 'image/png',
          sizeBytes: 96,
          documentId: document.id,
        },
      }),
    });
  });
  await page.route('**/api/v1/files/view/sample.png', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          objectName: 'sample.png',
          url: 'data:image/png;base64,iVBORw0KGgo=',
          originalName: 'sample.png',
          contentType: 'image/png',
          sizeBytes: 96,
          documentId: document.id,
        },
      }),
    });
  });

  await page.setInputFiles('[data-testid="memorica-image-upload"]', {
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a,
    ]),
  });

  await expect(page.getByTestId('memorica-upload-status')).toContainText('文件已插入：sample.png');
  await expect(page.getByTestId('memorica-document-image-node')).toBeVisible();
  await expect(page.getByTestId('memorica-document-image-node').locator('img')).toHaveAttribute('alt', 'sample.png');
  expect(uploadRequests).toBe(1);
});
```

Expected before implementation: FAIL because the image is rendered without the stable `memorica-document-image-node` test id.

- [x] **Step 2: Run RED**

```bash
cd frontend
npm run test:e2e -- attachment-upload-guard.spec.ts -g "image upload" --workers=1
```

Result before implementation: FAIL because the image upload succeeded but `memorica-document-image-node` did not exist.

- [x] **Step 3: Scope existing validation assertions to the stable upload status**

Change the unsupported-type and oversized-file assertions from global text matches to:

```ts
await expect(page.getByTestId('memorica-upload-status')).toContainText('仅支持 JPG、PNG、GIF、WebP 图片或 PDF 文件');
await expect(page.getByTestId('memorica-upload-status')).toContainText('文件不能超过 10 MB');
```

This avoids strict-mode ambiguity when Ant Design toast and the editor status strip show the same validation copy.

### Task 2: Image Node Selector

**Files:**
- Modify: `frontend/src/extensions/DocumentImage.tsx`

- [x] **Step 1: Add the stable node selector**

Change the NodeView wrapper to:

```tsx
<NodeViewWrapper
  className="memorica-document-image"
  data-type="document-image"
  data-testid="memorica-document-image-node"
  contentEditable={false}
>
```

- [x] **Step 2: Run GREEN**

```bash
cd frontend
npm run test:e2e -- attachment-upload-guard.spec.ts -g "image upload" --workers=1
```

Result after implementation: PASS, 1/1 focused test passed.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/attachment-upload-guard.spec.ts`
- Verify: `frontend/src/extensions/DocumentImage.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-image-upload-success-coverage.md`

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
- `npm run test:e2e -- attachment-upload-guard.spec.ts --workers=1`: PASS, 6/6 tests.
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
git add docs/superpowers/plans/2026-06-14-image-upload-success-coverage.md frontend/e2e/attachment-upload-guard.spec.ts frontend/src/extensions/DocumentImage.tsx
git commit -m "test: cover image upload success"
git push origin feat/pre-release-hardening
```
