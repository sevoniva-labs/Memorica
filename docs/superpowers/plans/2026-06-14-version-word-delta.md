# Version Word Delta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the word-count change for each version so users can scan whether a version added, removed, or preserved content.

**Architecture:** Keep the calculation in `VersionHistoryPage` because the backend already returns `wordCount` and `versionNumber` for the version list. Compare each version with the previous version by ascending `versionNumber`, then render a compact Ant Design `Tag` next to the total word count.

**Tech Stack:** React 19, TypeScript, Vite, Ant Design 5 `Tag`, Playwright route-mocked E2E.

---

### Task 1: Regression Test

**Files:**
- Modify: `frontend/e2e/version-history-permission.spec.ts`

- [x] **Step 1: Let the route helper accept multiple versions**

Change the helper signature:

```ts
async function openVersionHistory(page: Page, canWrite: boolean, versions = [version]) {
```

Change the list route body:

```ts
body: JSON.stringify({ data: { content: versions } }),
```

- [x] **Step 2: Add a failing word-delta test**

Add:

```ts
test('version list shows word count changes between versions', async ({ page }) => {
  const firstVersion = { ...version, id: 3101, versionNumber: 1, wordCount: 3 };
  const secondVersion = { ...version, id: 3102, versionNumber: 2, wordCount: 12 };

  await openVersionHistory(page, true, [secondVersion, firstVersion]);

  await expect(page.getByTestId('memorica-version-word-delta-3102')).toContainText('+9 词');
  await expect(page.getByTestId('memorica-version-word-delta-3101')).toContainText('初始');
});
```

- [x] **Step 3: Run RED**

Run:

```bash
cd frontend
npm run test:e2e -- version-history-permission.spec.ts -g "version list shows word count changes between versions" --workers=1
```

Expected before implementation: FAIL because the page has no `memorica-version-word-delta-*` elements.

### Task 2: Version List UI

**Files:**
- Modify: `frontend/src/pages/VersionHistoryPage.tsx`

- [x] **Step 1: Query Ant Design CLI**

Run:

```bash
cd frontend
npx antd info Tag --version 5.29.3 --format json
```

Expected: PASS and confirms `Tag` supports `color` and `bordered`.

- [x] **Step 2: Add delta helper**

Add a helper that sorts versions by `versionNumber`, compares the current `wordCount` with the previous version, and returns `{ text, color }`:

```ts
function versionWordDelta(version: DocumentVersion, versions: DocumentVersion[]) {
  const ordered = [...versions].sort((a, b) => a.versionNumber - b.versionNumber)
  const index = ordered.findIndex((item) => item.id === version.id)
  const previous = index > 0 ? ordered[index - 1] : null
  if (!previous) return { text: '初始', color: 'default' }

  const delta = (version.wordCount || 0) - (previous.wordCount || 0)
  if (delta > 0) return { text: `+${delta} 词`, color: 'green' }
  if (delta < 0) return { text: `${delta} 词`, color: 'red' }
  return { text: '无变化', color: 'default' }
}
```

- [x] **Step 3: Render an Ant Design Tag**

Inside `versions.map`, compute the delta and render it next to the total word count:

```tsx
const delta = versionWordDelta(v, versions)
```

```tsx
<Tag
  bordered={false}
  color={delta.color}
  className="m-0 text-[11px]"
  data-testid={`memorica-version-word-delta-${v.id}`}
>
  {delta.text}
</Tag>
```

- [x] **Step 4: Run GREEN**

Run:

```bash
cd frontend
npm run test:e2e -- version-history-permission.spec.ts -g "version list shows word count changes between versions" --workers=1
```

Expected after implementation: PASS.

### Task 3: Verification And Commit

**Files:**
- Verify: `frontend/e2e/version-history-permission.spec.ts`
- Verify: `frontend/src/pages/VersionHistoryPage.tsx`
- Verify: `docs/superpowers/plans/2026-06-14-version-word-delta.md`

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

- Ant Design CLI: `npx antd info Tag --version 5.29.3 --format json` passed.
- Red path confirmed: `memorica-version-word-delta-3102` was missing before implementation.
- Focused green path: word delta test passed.
- Related mocked regression: `version-history-permission.spec.ts` passed, 4 tests.
- `npm run lint`: passed.
- `npm run build`: passed with the existing Vite large chunk warning.
- `npm run antd:doctor`: passed, 25 checks.
- `npm run antd:lint`: passed, 0 issues.
- `git diff --check`: passed.

- [ ] **Step 2: Commit and push**

```bash
git add docs/superpowers/plans/2026-06-14-version-word-delta.md frontend/e2e/version-history-permission.spec.ts frontend/src/pages/VersionHistoryPage.tsx
git commit -m "feat: show version word count changes"
git push origin feat/pre-release-hardening
```
