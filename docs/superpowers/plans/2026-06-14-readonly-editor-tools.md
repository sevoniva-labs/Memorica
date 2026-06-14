# Readonly Editor Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent readonly viewers from seeing or entering editor tool surfaces that imply content mutation.

**Architecture:** Keep permission decisions in `CollabEditor`, where `canEdit` is already derived from document/API and collaboration auth state. Hide the rich-text mode switch for readonly users, render the rich toolbar only when editable, and disable hidden upload inputs as a defensive UI layer.

**Tech Stack:** React, TipTap, Ant Design Dropdown, Playwright E2E with real backend.

---

## File Structure

- Modify `frontend/e2e/editor-regression.spec.ts`
  - Extend the viewer permissions test to assert readonly users do not see editing menu actions or the rich-text mode switch.
- Modify `frontend/src/components/CollabEditor.tsx`
  - Hide `mode`, `diagram`, `image`, and `attachment` menu actions when `canEdit` is false.
  - Guard `handleMoreMenuClick` so readonly users cannot trigger edit actions even if a stale menu event fires.
  - Render `Toolbar` only when `mode === 'rich' && canEdit`.
  - Disable hidden image and attachment file inputs when readonly.

### Task 1: Red Test

- [x] Extend `viewer can open a shared document but cannot edit or invoke AI`.
- [x] Open the `更多` dropdown as the viewer.
- [x] Assert `插入图示`, `上传图片`, `上传附件`, and `切换为富文本` are not visible.

Run:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_SKIP_WEB_SERVER=true E2E_BASE_URL=http://localhost:5173 E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health npm run test:e2e -- editor-regression.spec.ts -g "viewer can open a shared document but cannot edit or invoke AI" --workers=1
```

Expected before implementation: FAIL because readonly users can still see `切换为富文本`.

Actual before implementation: FAIL because `getByText('切换为富文本')` resolved to a visible Ant Design dropdown item. The first attempted run failed earlier because no backend was listening on `127.0.0.1:8080`; the successful red run used a temporary Postgres container on `127.0.0.1:15432`, local backend on `8080`, local Hocuspocus on `1234`, and Playwright-managed Vite on `5173`.

### Task 2: Minimal Implementation

- [x] Keep find, versions, count, export, and reconnect actions available to readonly users.
- [x] Include `mode` only when `canEdit` is true.
- [x] Return early from `handleMoreMenuClick` for `diagram`, `image`, `attachment`, and `mode` when readonly.
- [x] Add `disabled={!canEdit || uploadingFile}` to image and attachment inputs.
- [x] Change the Toolbar render guard to `mode === 'rich' && canEdit`.

### Task 3: Verification

- [x] Focused E2E:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_SKIP_WEB_SERVER=true E2E_BASE_URL=http://localhost:5173 E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health npm run test:e2e -- editor-regression.spec.ts -g "viewer can open a shared document but cannot edit or invoke AI" --workers=1
```

- [x] Permission-adjacent E2E:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_SKIP_WEB_SERVER=true E2E_BASE_URL=http://localhost:5173 E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health npm run test:e2e -- editor-regression.spec.ts -g "viewer" --workers=1
```

- [x] Static checks:

```bash
cd frontend && npm run lint && npm run build && npm run antd:doctor && npm run antd:lint
git diff --check
```

Verification results:

- Red path confirmed: the viewer E2E failed because `切换为富文本` was visible to a readonly user.
- Focused green path: `viewer can open a shared document but cannot edit or invoke AI` passed.
- Permission-adjacent E2E: `editor-regression.spec.ts -g "viewer"` passed, 2 tests.
- `npm run lint`: passed.
- `npm run build`: passed with the existing Vite large chunk warning.
- `npm run antd:doctor`: passed, 25 checks.
- `npm run antd:lint`: passed, 0 issues.
- `make frontend-audit`: passed, 0 high production vulnerabilities.
- `make hocuspocus-check`: passed.
- `make hocuspocus-audit`: passed, 0 high production vulnerabilities.
- `make backend-unit-test`: passed.
- `git diff --check`: passed.
- Temporary services used for E2E were stopped after verification.

### Task 4: Commit

- [ ] Stage only the plan, E2E test, and editor component.
- [ ] Commit:

```bash
git add docs/superpowers/plans/2026-06-14-readonly-editor-tools.md frontend/e2e/editor-regression.spec.ts frontend/src/components/CollabEditor.tsx
git commit -m "fix: hide readonly editor tools"
git push origin feat/pre-release-hardening
```
