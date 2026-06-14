# Diagram Preview Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Draw.io diagram blocks recoverable when SVG preview data is missing but XML is still present.

**Architecture:** Keep the fallback inside the `Diagram` node view because it owns diagram block rendering and actions. Continue disabling SVG download when no SVG exists, but show a clear inline fallback that tells editors they can reopen the XML in Draw.io; viewers still get a safe readonly explanation.

**Tech Stack:** React 19, TypeScript, Tiptap NodeView, Ant Design icons, Playwright route-mocked E2E.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/diagram-download.spec.ts`

- [x] **Step 1: Add an insert helper for missing SVG previews**

Add:

```ts
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
```

- [x] **Step 2: Add a failing fallback test**

Add:

```ts
test('diagram without svg preview still exposes XML edit fallback', async ({ page }) => {
  await openEditor(page);
  await insertDiagramWithoutPreview(page, '可恢复图示');

  const diagram = page.getByTestId('memorica-diagram-node');
  await expect(diagram.getByTestId('memorica-diagram-preview-fallback')).toContainText('预览不可用');
  await expect(diagram.getByTestId('memorica-diagram-action-download')).toBeDisabled();

  await diagram.getByTestId('memorica-diagram-action-edit').click();
  await expect(page.locator('.memorica-drawio-frame')).toBeVisible({ timeout: 10_000 });
});
```

- [x] **Step 3: Run RED**

Run:

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "diagram without svg preview still exposes XML edit fallback" --workers=1
```

Expected before implementation: FAIL because there is no `memorica-diagram-preview-fallback` element.

### Task 2: Diagram Node Fallback UI

**Files:**
- Modify: `frontend/src/extensions/Diagram.tsx`
- Modify: `frontend/src/index.css`

- [x] **Step 1: Split preview state**

In `DiagramView`, compute:

```ts
const hasXml = Boolean(attrs.xml?.trim())
```

- [x] **Step 2: Render a clear fallback**

When `src` is empty, render:

```tsx
<div className="memorica-diagram-empty" data-testid="memorica-diagram-preview-fallback">
  <PartitionOutlined style={{ fontSize: 22 }} />
  <span className="memorica-diagram-empty-copy">
    <strong>预览不可用</strong>
    <em>{hasXml ? (canEdit ? 'XML 已保留，可重新编辑生成预览' : 'XML 已保留，请联系可编辑成员重新生成预览') : '图示数据为空'}</em>
  </span>
</div>
```

- [x] **Step 3: Add compact fallback copy styles**

Add:

```css
.memorica-diagram-empty-copy {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
}

.memorica-diagram-empty-copy strong {
  color: #1f2329;
  font-size: 13px;
  font-weight: 600;
}

.memorica-diagram-empty-copy em {
  color: #86909c;
  font-size: 12px;
  font-style: normal;
}
```

- [x] **Step 4: Run GREEN**

Run:

```bash
cd frontend
npm run test:e2e -- diagram-download.spec.ts -g "diagram without svg preview still exposes XML edit fallback" --workers=1
```

Expected after implementation: PASS.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/diagram-download.spec.ts`
- Verify: `frontend/src/extensions/Diagram.tsx`
- Verify: `frontend/src/index.css`
- Verify: `docs/superpowers/plans/2026-06-14-diagram-preview-fallback.md`

- [x] **Step 1: Run related checks**

```bash
cd frontend && npm run test:e2e -- diagram-download.spec.ts --workers=1
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
git diff --check
```

Verification results:

- Red path confirmed: `memorica-diagram-preview-fallback` was missing before implementation.
- Focused green path: missing SVG preview fallback test passed.
- Related mocked regression: `diagram-download.spec.ts` passed, 2 tests.
- `npm run lint`: passed.
- `npm run build`: passed with the existing Vite large chunk warning.
- `npm run antd:doctor`: passed, 25 checks.
- `npm run antd:lint`: passed, 0 issues.
- `git diff --check`: passed.
- Route-mocked diagram tests still log Vite WebSocket proxy `ECONNREFUSED` when Hocuspocus is not running; tests passed and this is unrelated to the fallback behavior.

- [ ] **Step 2: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-14-diagram-preview-fallback.md frontend/e2e/diagram-download.spec.ts frontend/src/extensions/Diagram.tsx frontend/src/index.css
git commit -m "feat: show diagram preview fallback"
git push origin feat/pre-release-hardening
```
