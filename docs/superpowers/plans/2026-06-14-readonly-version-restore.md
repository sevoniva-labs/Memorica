# Readonly Version Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent readonly users from seeing or initiating version restore from the version history page.

**Architecture:** `VersionHistoryPage` already loads the document before rendering versions. Use `doc.canWrite` as the page-level restore permission and keep version selection/read-only preview available for viewers.

**Tech Stack:** React, Ant Design icons, Playwright route-mocked E2E, Vite.

---

## File Structure

- Create `frontend/e2e/version-history-permission.spec.ts`
  - Mock `/doc/:id/versions` with `canWrite=false` and assert the restore action is hidden.
  - Mock the same route with `canWrite=true` and assert the restore action remains visible.
- Modify `frontend/src/pages/VersionHistoryPage.tsx`
  - Compute `canRestore` from `doc.canWrite === true`.
  - Hide the restore button for readonly users and render a short readonly note.
  - Keep selecting and previewing versions unchanged.

### Task 1: Red Test

- [x] Add a route-mocked test for `canWrite: false`.
- [x] Select version 1.
- [x] Assert `恢复此版本` is not visible.
- [x] Assert readonly note `只读用户不能恢复版本` is visible.
- [x] Add a route-mocked test for `canWrite: true`.
- [x] Select version 1 and assert `恢复此版本` is visible.

Run:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- version-history-permission.spec.ts --workers=1
```

Expected before implementation: FAIL because readonly users still see `恢复此版本`.

Actual before implementation: FAIL because `getByRole('button', { name: '恢复此版本' })` was visible for `canWrite: false`. The editor case passed before implementation.

### Task 2: Minimal Implementation

- [x] Add `const canRestore = doc?.canWrite === true`.
- [x] Keep `handleRestore` as a no-op when `canRestore` is false.
- [x] Render the restore button only when `canRestore` is true.
- [x] Render `<span data-testid="memorica-version-restore-readonly">只读用户不能恢复版本</span>` when false.

### Task 3: Verification

- [x] Focused mocked E2E:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- version-history-permission.spec.ts --workers=1
```

- [x] Related mocked regression:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- version-history-permission.spec.ts editor-share-permission.spec.ts --workers=1
```

- [x] Static checks:

```bash
cd frontend && npm run lint && npm run build && npm run antd:doctor && npm run antd:lint
make frontend-audit
make hocuspocus-check && make hocuspocus-audit
make backend-unit-test
git diff --check
```

Verification results:

- Red path confirmed: readonly user saw `恢复此版本` before implementation.
- Focused green path: `version-history-permission.spec.ts` passed, 2 tests.
- Related mocked regression: `version-history-permission.spec.ts` and `editor-share-permission.spec.ts` passed, 4 tests.
- `npm run lint`: passed.
- `npm run build`: passed with the existing Vite large chunk warning.
- `npm run antd:doctor`: passed, 25 checks.
- `npm run antd:lint`: passed, 0 issues.
- `make frontend-audit`: passed, 0 high production vulnerabilities.
- `make hocuspocus-check`: passed.
- `make hocuspocus-audit`: passed, 0 high production vulnerabilities.
- `make backend-unit-test`: passed.
- `git diff --check`: passed.
- Forbidden non-AntD UI dependency scan: no matches.

### Task 4: Commit

- [ ] Stage only the plan, E2E test, and version history page.
- [ ] Commit:

```bash
git add docs/superpowers/plans/2026-06-14-readonly-version-restore.md frontend/e2e/version-history-permission.spec.ts frontend/src/pages/VersionHistoryPage.tsx
git commit -m "fix: hide readonly version restore"
git push origin feat/pre-release-hardening
```
