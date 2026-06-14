# Attachment Upload Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side upload guards so unsupported or oversized images/PDFs are rejected with clear Ant Design feedback before hitting the backend.

**Architecture:** Mirror the backend default upload policy in a small frontend utility module. Keep `CollabEditor` responsible for editor insertion and status updates, while the utility owns accepted MIME types, file size formatting, and validation messages.

**Tech Stack:** React 19, TypeScript, Ant Design 5, @ant-design/icons, TipTap, Playwright, Vite.

---

## File Structure

- Create `frontend/src/files/uploadPolicy.ts`
  - Export accepted MIME types, file input `accept` strings, and `validateUploadFile(file, target)`.
- Create `frontend/e2e/attachment-upload-guard.spec.ts`
  - Route-mocked editor tests for unsupported files and oversized PDFs.
- Modify `frontend/src/components/CollabEditor.tsx`
  - Validate before `uploadFile`.
  - Show `message.warning(...)`.
  - Narrow file input `accept` values to the backend-supported image/PDF types.

## Task 1: Red Tests

- [x] Add a Playwright test that opens `/doc/upload-guard-doc` with mocked API responses.
- [x] Set a `.txt` file on `memorica-attachment-upload`.
- [x] Assert the page shows `仅支持 JPG、PNG、GIF、WebP 图片或 PDF 文件`.
- [x] Assert `/api/v1/files/upload` was not called.
- [x] Add a second test that sets an `application/pdf` file with size `10 * 1024 * 1024 + 1`.
- [x] Assert the page shows `文件不能超过 10 MB`.
- [x] Assert `/api/v1/files/upload` was not called.
- [x] Run:

```bash
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' \
npm run test:e2e -- attachment-upload-guard.spec.ts --workers=1
```

Expected before implementation: tests fail because the editor currently attempts upload and does not show client-side warnings.

## Task 2: Upload Policy Utility

- [x] Create `MAX_UPLOAD_BYTES = 10 * 1024 * 1024`.
- [x] Create `SUPPORTED_UPLOAD_TYPES` for `image/jpeg`, `image/png`, `image/gif`, `image/webp`, and `application/pdf`.
- [x] Export `IMAGE_ACCEPT` as `.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp`.
- [x] Export `ATTACHMENT_ACCEPT` as `${IMAGE_ACCEPT},application/pdf,.pdf`.
- [x] Export `validateUploadFile(file, target)` returning `{ ok: true }` or `{ ok: false, message: string }`.

## Task 3: Editor Integration

- [x] Import the utility in `frontend/src/components/CollabEditor.tsx`.
- [x] Validate the selected file before setting `uploadingFile` or `versionSaveState`.
- [x] On invalid files, call `message.warning(validation.message)` and return.
- [x] Use `IMAGE_ACCEPT` for the image input and `ATTACHMENT_ACCEPT` for the attachment input.

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
git add docs/superpowers/plans/2026-06-14-attachment-upload-guard.md frontend/e2e/attachment-upload-guard.spec.ts frontend/src/files/uploadPolicy.ts frontend/src/components/CollabEditor.tsx
git commit -m "feat: guard unsupported attachment uploads"
git push
```

## Verification Result

- Red path confirmed: `attachment-upload-guard.spec.ts` failed before implementation because no client-side warning was shown.
- Green path confirmed: unsupported `.txt` and oversized PDF uploads were rejected before `/api/v1/files/upload`.
- Regression confirmed: `attachment-upload-guard.spec.ts`, `diagram-download.spec.ts`, and `diagram-template-picker.spec.ts` passed together.
- Static checks confirmed: frontend lint, build, Ant Design doctor, Ant Design lint, frontend audit, Hocuspocus syntax/audit, backend unit tests, `git diff --check`, and forbidden UI dependency scan passed before commit.
