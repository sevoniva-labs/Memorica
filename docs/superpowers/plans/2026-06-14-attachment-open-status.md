# Attachment Open Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make attachment open/view failures visible inside the attachment node so permission or network errors do not look like a no-op.

**Architecture:** Keep the status local to the TipTap attachment node because the failure belongs to a single embedded file. Reuse the existing `apiErrorMessage` helper so backend `message` payloads and network failures map to consistent Chinese copy.

**Tech Stack:** React, TipTap NodeView, Ant Design icons, Playwright route-mocked E2E, Vite.

---

## File Structure

- Modify `frontend/e2e/attachment-upload-guard.spec.ts`
  - Add a route-mocked E2E case that uploads a PDF, blocks the file-view URL with `403`, clicks the attachment open button, and expects an inline attachment status.
- Modify `frontend/src/extensions/Attachment.tsx`
  - Add local error status state, catch `getFileUrl` failures, and render a stable status line under the file metadata.
- Modify `frontend/src/index.css`
  - Add compact attachment status styling that fits the existing attachment node.

### Task 1: Red Test

- [x] Add a Playwright test named `attachment open permission failure shows inline status`.
- [x] Mock `/api/v1/files/upload` to return `private.pdf`.
- [x] Mock `/api/v1/files/view/private.pdf` to return `403` with `message: '无权访问该文件'`.
- [x] Click the attachment `打开` button.
- [x] Expect `memorica-attachment-status` to contain `权限不足：无权访问该文件`.

Run:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- attachment-upload-guard.spec.ts --workers=1
```

Expected before implementation: FAIL because `memorica-attachment-status` is not rendered.

Actual before implementation: FAIL with `element(s) not found` for `getByTestId('memorica-attachment-status')`, while the four existing upload-guard tests passed.

### Task 2: Minimal Implementation

- [x] Import `apiErrorMessage` in `frontend/src/extensions/Attachment.tsx`.
- [x] Add `AttachmentStatus` state with `{ state: 'error'; text: string }`.
- [x] Clear status before each open attempt.
- [x] Catch `getFileUrl` failures and render `权限不足：...` when the message mentions permission, otherwise `打开失败：...`.
- [x] Render `<div className="memorica-attachment-status" data-testid="memorica-attachment-status">`.
- [x] Add `data-testid="memorica-attachment-open"` to the button for stable future coverage.

### Task 3: Verification

- [x] Focused green test:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- attachment-upload-guard.spec.ts --workers=1
```

- [x] Mocked editor regression group:

```bash
cd frontend
rm -rf test-results playwright-report
E2E_BASE_URL=http://localhost:5173 E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' npm run test:e2e -- attachment-upload-guard.spec.ts diagram-download.spec.ts diagram-template-picker.spec.ts --workers=1
```

- [x] Project checks:

```bash
cd frontend && npm run lint && npm run build && npm run antd:doctor && npm run antd:lint
make frontend-audit
make hocuspocus-check && make hocuspocus-audit
make backend-unit-test
git diff --check
```

Verification results:

- `attachment-upload-guard.spec.ts`: 5 passed.
- `attachment-upload-guard.spec.ts diagram-download.spec.ts diagram-template-picker.spec.ts`: 9 passed.
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

- [ ] Stage only the plan, E2E test, attachment node, and CSS files.
- [ ] Commit:

```bash
git add docs/superpowers/plans/2026-06-14-attachment-open-status.md frontend/e2e/attachment-upload-guard.spec.ts frontend/src/extensions/Attachment.tsx frontend/src/index.css
git commit -m "feat: show attachment open failures"
git push origin feat/pre-release-hardening
```
