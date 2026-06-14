# Diagram Download Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Draw.io SVG downloads always use a safe, predictable filename even when the diagram title is empty, illegal, or hostile.

**Architecture:** Keep the filename policy in a small diagram utility module so the Diagram node view stays focused on rendering and actions. Prove behavior through a route-mocked Playwright test that inserts a diagram and inspects the browser download filename.

**Tech Stack:** React 19, TypeScript, Ant Design 5, @ant-design/icons, TipTap, Playwright, Vite.

---

## File Structure

- Create `frontend/e2e/diagram-download.spec.ts`
  - Route-mocked editor test for inserting a diagram with an unsafe title and verifying the SVG download filename falls back to `diagram.svg`.
- Create `frontend/src/diagram/files.ts`
  - Export `safeDiagramDownloadName(title)` for filename normalization.
- Modify `frontend/src/extensions/Diagram.tsx`
  - Replace the private filename helper with the shared utility.

## Task 1: Red Test

- [x] Add a Playwright test that opens `/doc/download-doc` with mocked API responses.
- [x] Insert a blank Draw.io diagram using the template picker.
- [x] Use a title containing only forbidden filename characters: `///`.
- [x] Simulate a Draw.io `export` message with valid XML and SVG payload.
- [x] Click `memorica-diagram-action-download`.
- [x] Assert `download.suggestedFilename()` is `diagram.svg`.
- [x] Run:

```bash
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' \
npm run test:e2e -- diagram-download.spec.ts --workers=1
```

Expected before implementation: fail because the current filename helper returns an underscore-only filename.

## Task 2: Filename Utility

- [x] Create `safeDiagramDownloadName(title: string): string`.
- [x] Trim whitespace, replace forbidden Windows/macOS path characters and control characters with `_`.
- [x] Collapse repeated `_`, strip leading/trailing dots, spaces, and underscores.
- [x] Use fallback basename `diagram` when the sanitized basename is empty.
- [x] Cap basename length at 80 characters before appending `.svg`.

## Task 3: Diagram Node Integration

- [x] Import `safeDiagramDownloadName` in `frontend/src/extensions/Diagram.tsx`.
- [x] Set `link.download = safeDiagramDownloadName(title)`.
- [x] Keep the existing disabled state when SVG data is missing, so preview failures can still be edited without enabling invalid downloads.

## Task 4: Verification And Commit

- [x] Run the focused E2E command from Task 1 and verify it passes.
- [x] Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
make frontend-audit
git diff --check
```

- [ ] Commit and push:

```bash
git add docs/superpowers/plans/2026-06-14-diagram-download-safety.md frontend/e2e/diagram-download.spec.ts frontend/src/diagram/files.ts frontend/src/extensions/Diagram.tsx
git commit -m "feat: harden diagram download names"
git push
```

## Verification Result

- Red path confirmed: `diagram-download.spec.ts` failed with received filename `___.svg`.
- Green path confirmed: `diagram-download.spec.ts` passed after routing downloads through `safeDiagramDownloadName`.
- Regression confirmed: `diagram-download.spec.ts` and `diagram-template-picker.spec.ts` passed together.
- Static checks confirmed: frontend lint, build, Ant Design doctor, Ant Design lint, frontend audit, Hocuspocus syntax/audit, backend unit tests, `git diff --check`, and forbidden UI dependency scan passed before commit.
