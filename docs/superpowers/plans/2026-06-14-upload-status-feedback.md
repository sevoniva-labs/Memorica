# Upload Status Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make attachment/image upload progress, success, failure, and permission-denied states visible inside the editor, not only as transient toast messages.

**Architecture:** Keep upload state local to `CollabEditor` because it owns the upload action and document insertion. Render a compact editor-level status strip with stable `data-testid` coverage so E2E can prove the user sees the current upload state.

**Tech Stack:** React 19, TypeScript, Ant Design 5, @ant-design/icons, TipTap, Playwright, Vite.

---

## File Structure

- Modify `frontend/e2e/attachment-upload-guard.spec.ts`
  - Add route-mocked upload success and permission failure tests.
- Modify `frontend/src/components/CollabEditor.tsx`
  - Add `uploadStatus` state, set it during upload lifecycle, and render a status strip.
- Modify `frontend/src/index.css`
  - Add compact status strip styles for uploading, success, and error.

## Task 1: Red Tests

- [x] Add a test where `/api/v1/files/upload` resolves slowly and returns a valid PDF payload.
- [x] Assert `memorica-upload-status` first contains `正在上传 sample.pdf`.
- [x] Assert it later contains `文件已插入：sample.pdf`.
- [x] Assert the attachment node contains `sample.pdf`.
- [x] Add a test where `/api/v1/files/upload` returns `403` with message `无权向该文档上传文件`.
- [x] Assert `memorica-upload-status` contains `权限不足：无权向该文档上传文件`.
- [x] Assert no attachment node is inserted.
- [x] Run:

```bash
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' \
npm run test:e2e -- attachment-upload-guard.spec.ts --workers=1
```

Expected before implementation: tests fail because the editor has no stable upload status strip.

## Task 2: Editor State

- [x] Add `type UploadStatus = { state: 'uploading' | 'success' | 'error', text: string }`.
- [x] Add `const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null)`.
- [x] Set error upload status for client-side validation failures.
- [x] Set uploading status before calling `uploadFile`.
- [x] Set success status after inserting image or attachment nodes.
- [x] Set permission-denied status when the API error message includes permission wording.

## Task 3: Editor UI

- [x] Render a status strip after the draft recovery banner:

```tsx
{uploadStatus && (
  <div className="memorica-editor-upload-status" data-state={uploadStatus.state} data-testid="memorica-upload-status">
    <span>{uploadStatus.text}</span>
    <button type="button" onClick={() => setUploadStatus(null)}>关闭</button>
  </div>
)}
```

- [x] Keep the strip text concise so it does not crowd mobile layouts.

## Task 4: Verification And Commit

- [x] Run the focused E2E command from Task 1 and verify it passes.
- [x] Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
make frontend-audit
make hocuspocus-audit
make hocuspocus-check
make backend-unit-test
git diff --check
```

- [ ] Commit and push:

```bash
git add docs/superpowers/plans/2026-06-14-upload-status-feedback.md frontend/e2e/attachment-upload-guard.spec.ts frontend/src/components/CollabEditor.tsx frontend/src/index.css
git commit -m "feat: show attachment upload status"
git push
```

## Verification Result

- Red path confirmed: the upload progress/success and permission-denied tests failed before implementation because `memorica-upload-status` did not exist.
- Green path confirmed: `attachment-upload-guard.spec.ts` passed with unsupported type, oversized file, upload progress, upload success, and permission-denied coverage.
- Regression confirmed: `attachment-upload-guard.spec.ts`, `diagram-download.spec.ts`, and `diagram-template-picker.spec.ts` passed together.
- Static checks confirmed: frontend lint, build, Ant Design doctor, Ant Design lint, frontend audit, Hocuspocus syntax/audit, backend unit tests, `git diff --check`, and forbidden UI dependency scan passed before commit.
