# Draw.io Template Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Draw.io insertion template center to the required eight practical template types with search, categories, and recent-use affordances.

**Architecture:** Keep template data in `frontend/src/diagram/templates.ts` and picker UI in `frontend/src/components/DiagramTemplatePicker.tsx`. Use Ant Design controls only. Persist recent template ids in `localStorage` so the picker improves across repeated use without backend changes.

**Tech Stack:** React 19, TypeScript, Ant Design 5, @ant-design/icons, Playwright, Vite.

---

## File Structure

- Create `frontend/e2e/diagram-template-picker.spec.ts`
  - Route-mocked Playwright coverage for opening the picker from the editor, verifying eight templates, searching, filtering by category, and recent-use behavior.
- Modify `frontend/src/diagram/templates.ts`
  - Expand `DiagramTemplateId`.
  - Add `category`, `keywords`, and XML for architecture, swimlane, ER, and state-machine templates.
- Modify `frontend/src/components/DiagramTemplatePicker.tsx`
  - Add search input, category segmented control, recent template row, and localStorage-backed recent tracking.
- Modify `frontend/src/index.css`
  - Add compact picker toolbar/recent/category styling and preserve mobile one-column layout.

## Task 1: Red Tests

- [x] Add a Playwright test that opens `/doc/template-doc` with mocked API responses, opens the Draw.io template picker, and expects template test ids:
  - `memorica-diagram-template-blank`
  - `memorica-diagram-template-flowchart`
  - `memorica-diagram-template-mindmap`
  - `memorica-diagram-template-sequence`
  - `memorica-diagram-template-architecture`
  - `memorica-diagram-template-swimlane`
  - `memorica-diagram-template-er`
  - `memorica-diagram-template-state`
- [x] Add a Playwright test that searches `ER`, expects only `ER 图` to remain visible, clears search, filters category `系统`, and expects `系统架构图` plus `ER 图`.
- [x] Add a Playwright test that selects `时序图`, reopens the picker, and expects the recent row to show `时序图`.
- [x] Run:

```bash
cd frontend
E2E_BASE_URL=http://localhost:5173 \
E2E_WEB_SERVER_COMMAND='npm run dev -- --host 0.0.0.0 --port 5173' \
npm run test:e2e -- diagram-template-picker.spec.ts --workers=1
```

Expected before implementation: tests fail because expanded templates, search, categories, and recent row do not exist.

## Task 2: Template Data

- [x] Update `DiagramTemplateId` to include `architecture`, `swimlane`, `er`, and `state`.
- [x] Add `category: 'basic' | 'process' | 'system' | 'planning'` and `keywords: string[]` to `DiagramTemplate`.
- [x] Add four XML templates:
  - `architecture`: browser, API, collaboration, database, object storage, cache.
  - `swimlane`: three horizontal lanes with start, review, approve, publish.
  - `er`: user, document, permission entities with relationship edges.
  - `state`: draft, editing, saved, shared, archived states with transitions.

## Task 3: Picker UI

- [x] Add search state and category state.
- [x] Render an Ant Design `Input` with `SearchOutlined` and `data-testid="memorica-diagram-template-search"`.
- [x] Render an Ant Design segmented control with all/basic/process/system/planning options and `data-testid="memorica-diagram-template-category"`.
- [x] Filter templates by category and search text against name, description, and keywords.
- [x] Persist the selected template id to `memorica:diagram-recent-templates`.
- [x] Render a compact recent row when saved ids exist with `data-testid="memorica-diagram-template-recent"`.

## Task 4: Verification And Commit

- [x] Run the focused E2E command from Task 1 and verify it passes.
- [x] Run:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
make frontend-audit
```

- [ ] Run:

```bash
git diff --check
git status --short --branch
git add docs/superpowers/plans/2026-06-14-drawio-template-center.md frontend/e2e/diagram-template-picker.spec.ts frontend/src/diagram/templates.ts frontend/src/components/DiagramTemplatePicker.tsx frontend/src/index.css
git commit -m "feat: expand drawio template center"
git push
```

## Verification Result

- Red path confirmed: category filtering test failed when `基础` was missing.
- Green path confirmed: focused Draw.io template picker E2E passed after adding the basic category option.
- Static checks confirmed: frontend lint, build, Ant Design doctor, Ant Design lint, frontend audit, Hocuspocus syntax/audit, and backend unit tests passed before commit.
