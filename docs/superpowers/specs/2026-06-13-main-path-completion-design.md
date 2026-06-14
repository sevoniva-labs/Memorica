# Memorica Main Path Completion Design

## Decision

The approved direction is **A: complete the collaborative document main path first, with Draw.io as a first-class module inside that path**.

This means the first delivery is not a broad admin console and not a standalone diagram tool. It is a demoable collaborative document product loop:

1. Sign in or register.
2. See a useful document library.
3. Create or open a document.
4. Edit collaboratively with reliable save state.
5. Insert and manage a Draw.io diagram.
6. Upload useful supporting files.
7. Share with viewer/editor permissions.
8. Restore from version history.
9. Verify the whole path with automated checks and a browser smoke pass.

## Current Baseline

The project already has the right foundation:

- React 19, Vite, TypeScript, Ant Design 5, Ant Design ProComponents.
- `ProLayout` application shell and `ProTable` document list.
- Tiptap/Yjs/Hocuspocus collaborative editor.
- Document folders, favorites, trash, sharing, version history, file upload, and AI assistant primitives.
- Draw.io integration via `DrawioDialog` and a Tiptap `Diagram` node.
- E2E coverage for saving, local draft recovery, read-only sharing, shared documents, Draw.io insertion, version restore, attachment permissions, and optional AI provider checks.

The gaps are mostly product closure and reliability:

- Draw.io is insertable, but it lacks a polished entry flow, template choices, diagram block actions, clearer error recovery, and full version/share/read-only verification for edits.
- The editor has many capabilities, but the main path does not yet present them as a coherent Ant Design Pro workflow.
- Some local setup paths still need domestic mirrors and preview-friendly defaults.
- Tests cover important slices, but not the final “demo path” as a single story.

## Goals

### Main Path

The document product must feel complete enough to demo:

- A new user can register, create a document, type content, see save status, reload, and keep the content.
- The document list should make the next action obvious: create document, create folder, search, filter, open, favorite, move, restore, or delete.
- The editor should keep the user oriented with clear document title, connection state, save state, share action, AI action, and more menu.
- Read-only users can view shared documents without edit affordances that would fail later.

### Draw.io

Draw.io must become a first-class diagram block:

- Users can insert a diagram from the toolbar, slash menu, or more menu.
- Insert flow starts with a small Ant Design modal or panel that offers practical templates:
  - Blank diagram.
  - Flowchart.
  - Mind map.
  - Sequence/process sketch.
- The Draw.io modal clearly communicates loading, ready, saving, saved, timed out, and failed states.
- Saved diagrams render as stable document blocks with title, updated time, preview, and actions.
- Diagram block actions:
  - Edit.
  - Rename.
  - Duplicate.
  - Download SVG.
  - Delete with confirmation.
- Restored versions must preserve diagram XML/SVG so the diagram remains editable after restore.
- Viewer/read-only mode must allow preview and download but not edit, rename, duplicate, or delete.

### Reliability

- Auto-save and manual-save paths should not lose diagram or upload changes.
- Local draft recovery must continue working when version save fails.
- Hocuspocus authorization must continue enforcing document read/write permissions.
- File URLs and attachments must follow document sharing permissions.
- Domestic source configuration should cover npm and Gradle paths needed for local development.

## Non-Goals For This Phase

- Full enterprise administration dashboards.
- Billing, organization settings, SSO, or audit analytics.
- A self-hosted Draw.io deployment by default.
- New backend tables for diagrams. Diagram data remains embedded in the Tiptap JSON and Yjs document state.
- Full offline collaborative editing beyond the existing local draft recovery.

## UX Design

### Document Library

The document library remains the first screen after login. It should stay dense and operational rather than marketing-like:

- Top area: workspace/user context, quick actions, search.
- Left/menu area: workspace, owned, recent, favorite, shared, public, trash.
- Table area: files and folders with clear type icon, owner, update time, and actions.
- Empty states should include the next useful action, not explanatory product copy.

### Editor

The editor should behave like a focused collaborative workspace:

- Top bar:
  - Back.
  - Editable title.
  - Collaboration status.
  - Save status.
  - Share.
  - AI.
  - More actions.
- Rich toolbar remains available in rich mode.
- Slash menu remains available in notion mode.
- All visible controls must respect `canEdit`.

### Draw.io Flow

The target flow:

1. User chooses “插入图示”.
2. Template picker opens with four options and an optional title field.
3. User selects a template.
4. Draw.io opens with that XML loaded.
5. User saves.
6. App exports SVG and stores both XML and SVG in the diagram node.
7. Diagram block appears in the editor.
8. Auto-save creates a version that includes the diagram.
9. User can edit, rename, duplicate, download, or delete the block.

Failure states:

- If Draw.io iframe does not initialize, show retry and cancel.
- If save/export times out, keep the modal open and allow retry.
- If the exported SVG is empty but XML exists, insert a recoverable diagram fallback block instead of losing the diagram.
- If user closes/cancels, do not insert or mutate the diagram.

## Technical Design

### Frontend Files

- `frontend/src/components/DiagramTemplatePicker.tsx`
  - New Ant Design modal/panel for template selection and title entry.
  - Owns template choice UI only.

- `frontend/src/diagram/templates.ts`
  - New pure module with template definitions and XML builders.
  - Exports `DIAGRAM_TEMPLATES` and `createDiagramXml(templateId)`.

- `frontend/src/components/DrawioDialog.tsx`
  - Keep as the iframe/protocol boundary.
  - Add explicit state machine: `loading`, `ready`, `saving`, `timeout`, `error`.
  - Accept initial title/XML from template picker or existing diagram.
  - Emit structured `DiagramAttrs`.

- `frontend/src/extensions/Diagram.tsx`
  - Expand node view actions.
  - Add read-only behavior via editor state or payload flag passed from `CollabEditor`.
  - Add stable `data-testid` selectors for tests.

- `frontend/src/components/CollabEditor.tsx`
  - Coordinate template picker, Draw.io dialog, and diagram block actions.
  - Keep save/version logic centralized.
  - Ensure diagram operations mark content dirty and trigger save.

- `frontend/src/pages/DocumentListPage.tsx`
  - Keep current ProTable structure.
  - Tighten empty states and action labels if needed for demo path.

- `frontend/e2e/editor-regression.spec.ts`
  - Extend Draw.io tests for template insert, rename/edit/duplicate/download/delete, read-only restrictions, and restore editability.

### Backend Files

No new backend endpoints are required for Draw.io in this phase.

Backend work is limited to:

- Keeping current document/version/file/share APIs stable.
- Adding tests only if frontend scenarios expose a backend bug.
- Preserving domestic source configuration in Gradle/Maven setup.

### Data Shape

Diagram node attributes remain:

```ts
interface DiagramAttrs {
  xml: string
  svg?: string
  title?: string
  updatedAt?: string
}
```

No server-side diagram ID is introduced. Duplicate creates a second diagram node with copied XML/SVG and a new title suffix.

## Testing Strategy

### Test-First Rules

Every behavior change starts with a failing test:

- Pure template generation gets unit-level tests if a suitable frontend test runner exists; otherwise it gets E2E assertions against generated XML content.
- UI behavior gets Playwright E2E tests.
- Backend bug fixes get Java tests before implementation.

### Required E2E Coverage

Add or extend tests for:

- New user can complete the demo path: register, create doc, type text, insert diagram, upload attachment, save, reload.
- Draw.io template insert persists XML/SVG and title.
- Diagram rename persists after reload and version save.
- Diagram duplicate creates two independent blocks.
- Diagram delete removes the block and persists removal.
- Version restore preserves diagram editability.
- Viewer can preview/download but cannot mutate a diagram.
- Draw.io save timeout shows retry without losing current XML.

### Verification Commands

The final implementation must pass:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
make frontend-audit
make hocuspocus-audit
```

When local services are available:

```bash
cd frontend
E2E_BASE_URL=http://127.0.0.1:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e
```

## Delivery Phases

### Phase 1: Demo Path Stabilization

- Confirm local services and demo account flow.
- Add a single “demo path” E2E test.
- Fix any failures in create/open/edit/save/reload/share basics.

### Phase 2: Draw.io First-Class Block

- Add template picker.
- Add Draw.io protocol states.
- Add diagram block actions.
- Add read-only behavior.
- Add Draw.io E2E coverage.

### Phase 3: Polish And Resilience

- Improve empty states and editor status surfaces.
- Tighten source configuration and README quick-start notes.
- Run full verification and browser smoke pass.

## Acceptance Criteria

This work is complete when:

- A fresh local environment can run the app with domestic package/build sources configured.
- A demo user can finish the full document path without manual database changes.
- Draw.io templates, save, edit, rename, duplicate, download, delete, version restore, and read-only behavior all work.
- Automated tests cover the main path and Draw.io behaviors.
- Required lint/build/Ant Design/audit checks pass.
- Browser smoke verification confirms the real UI renders and the main path can be exercised.
