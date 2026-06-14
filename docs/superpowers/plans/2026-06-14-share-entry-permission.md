# Share Entry Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the share-management entry for users who can edit or view a document but cannot manage its permissions.

**Architecture:** `EditorPage` already loads `DocumentItem.canManage` from the backend, so pass that value into `CollabEditor` next to `canWrite`. `CollabEditor` remains the single owner of topbar UI permission decisions and only renders `ShareSettingsPanel` from a manage-capable state.

**Tech Stack:** React, Ant Design icons, Playwright route-mocked E2E, Vite.

---

## File Structure

- Create `frontend/e2e/editor-share-permission.spec.ts`
  - Mock the editor page API response with `canWrite` and `canManage` variations.
  - Assert non-managers do not see the `分享` management button.
  - Assert managers still see the `分享` management button.
- Modify `frontend/src/pages/EditorPage.tsx`
  - Pass `doc.canManage === true` into `CollabEditor`.
- Modify `frontend/src/components/CollabEditor.tsx`
  - Add `initialCanManage`.
  - Render the share-management button and panel only when `canManage` is true.

### Task 1: Red Test

- [x] Add a route-mocked test for `canWrite: true, canManage: false`.
- [x] Assert the editor opens but `分享` is not visible.
- [x] Add a route-mocked test for `canWrite: true, canManage: true`.
- [x] Assert `分享` is visible.

Run:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- editor-share-permission.spec.ts --workers=1
```

Expected before implementation: FAIL because `canManage: false` users still see the share button.

Actual before implementation: FAIL because `getByRole('button', { name: '分享' })` was visible for a non-manager editor. The manager case passed before implementation.

### Task 2: Minimal Implementation

- [x] Extend `CollabEditor` props with `initialCanManage?: boolean`.
- [x] Use `initialCanManage` as the topbar manage-permission source.
- [x] Pass `initialCanManage={doc.canManage === true}` from `EditorPage`.
- [x] Render the `分享` button only when `canManage` is true.
- [x] Render `ShareSettingsPanel` only when `canManage` is true.

### Task 3: Verification

- [x] Focused mocked E2E:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- editor-share-permission.spec.ts --workers=1
```

- [x] Existing permission mocked E2E:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- editor-share-permission.spec.ts attachment-upload-guard.spec.ts diagram-download.spec.ts diagram-template-picker.spec.ts --workers=1
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

- Red path confirmed: non-manager editor saw `分享` before implementation.
- Focused green path: `editor-share-permission.spec.ts` passed, 2 tests.
- Mocked regression group: `editor-share-permission.spec.ts`, `attachment-upload-guard.spec.ts`, `diagram-download.spec.ts`, and `diagram-template-picker.spec.ts` passed, 11 tests.
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

- [ ] Stage only the plan, E2E test, `EditorPage`, and `CollabEditor`.
- [ ] Commit:

```bash
git add docs/superpowers/plans/2026-06-14-share-entry-permission.md frontend/e2e/editor-share-permission.spec.ts frontend/src/pages/EditorPage.tsx frontend/src/components/CollabEditor.tsx
git commit -m "fix: gate share entry by manage permission"
git push origin feat/pre-release-hardening
```
