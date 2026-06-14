# Memorica Collaboration Main Path Phase 2 Design

## Decision

Phase 2 will strengthen the collaborative document main path without changing the product architecture. The work stays inside the existing React, Ant Design, Tiptap, Yjs, Hocuspocus, and Spring Boot stack. The first implementation slice should focus on the user-visible reliability gaps that can break a demo even when the core editor is functional:

1. Document library actions must be resistant to duplicate clicks, slow networks, empty states, and failed requests.
2. Editor save status must distinguish title save, content version save, local draft, offline, retrying, and read-only mode.
3. Local draft recovery must remain available after a failed save or reload and must not overwrite a newer server version silently.
4. Collaboration status must clearly show connecting, connected, reconnecting, disconnected, and read-only states.
5. Mobile and narrow layouts must keep primary actions reachable without overlap.

This phase is not a redesign. It is a hardening pass over the existing screens and APIs.

## Current Evidence

The project already has useful foundations:

- `frontend/src/pages/DocumentListPage.tsx` supports workspace, my documents, recent, favorites, shared, public, trash, folders, search, rename, move, delete, restore, and favorite actions.
- `frontend/src/components/CollabEditor.tsx` already has title editing, content version saving, local drafts, keepalive save, restore from version, Draw.io insertion, attachment upload, share panel, AI panel, and Hocuspocus connection tracking.
- `frontend/e2e/editor-regression.spec.ts` already covers save/reload, local draft recovery, shared viewer read-only mode, shared documents tab, demo path, Draw.io insertion/actions/read-only/restore, attachment permissions, and optional AI provider checks.
- `backend/src/main/java/sevoniva/memorica/service/DocumentService.java` already enforces document ownership and permission checks for create, list, update, move, delete, restore, favorite, version, and sharing operations.

The visible gaps are mostly operational:

- `handleCreate` can be triggered more than once before navigation completes.
- Document list request failures only show a toast and an empty table; there is no inline retry state.
- Create, rename, move, delete, restore, and folder creation do not consistently expose pending state.
- Search is client-filtered after server search, which can hide items unexpectedly if future pages are added.
- Save status is centered in the editor, but title save and content save can conflict in the user message.
- Failed save retry is present, but the retry state is not explicit enough for demo and E2E assertions.
- Draft recovery restores content but should explicitly state whether it is newer than the last server version when that evidence exists.
- Mobile CSS still has several old `.semi-*` selectors and the editor topbar relies on compact custom buttons rather than a predictable overflow pattern.

## Scope

### Document Library

Keep the current Ant Design ProTable structure and tab set. Add behavior and state, not a new page shell.

- Add a single `creatingDocument` guard used by quick action, empty state, and toolbar create buttons.
- Use Ant Design button `loading`/`disabled` states for create, folder create, rename, move, delete, restore, and favorite mutations.
- Add an inline `Alert` or compact retry row for list load failures. The retry action must call the same `fetchDocuments` path with the current tab, query, workspace, and folder.
- Keep tab names stable: 全部文档、归我所有、最近访问、收藏、与我共享、公开文档、回收站.
- Keep folder breadcrumbs, but ensure switching tab resets folder and query exactly once.
- Preserve `data-testid="memorica-create-document"` for existing E2E coverage.

### Editor Save And Draft State

Keep `saveCurrentVersion`, `writeLocalDraft`, and `saveVersionKeepalive` as the core save path. Make the state model clearer around it.

- Replace the single save text computation with a small derived view model:
  - `readonly`: viewer cannot edit.
  - `saving`: local draft exists and remote save is pending.
  - `saved`: latest content fingerprint matches server version.
  - `local`: draft is safely stored locally but cannot be pushed now.
  - `retrying`: a failed save has a scheduled retry.
  - `error`: retry is not scheduled or manual retry is required.
- Title save failure should not imply body save failure. Show title failure in the title area or a short tooltip instead of replacing body save status.
- When a remote save fails, keep the local draft banner available after reload and show the retry interval in copy.
- When restoring a draft, save it as a new version and keep the editor editable.
- Do not clear local draft until the server accepts a version or the user explicitly discards it.

### Collaboration State

Keep Hocuspocus provider configuration unchanged unless a test proves a bug.

- Show one compact status pill with state text:
  - 连接中
  - 协作中
  - 正在重连
  - 已断开
  - 只读
- Keep the reconnect button visible only when disconnected.
- `authenticationFailed` should refresh token once and then show a readable failure state if reconnect still fails.
- Viewer mode must keep editor `contenteditable=false`, hide content mutation actions, and keep share/view actions that are allowed.

### Mobile And Narrow Layout

Keep the current dense document-tool style. Do not introduce marketing sections or large cards.

- At widths under 900px, collapse editor secondary actions into the More dropdown.
- Keep Back, title, save/collab status, and More visible.
- Hide text labels on icon buttons where the icon and tooltip are enough.
- Ensure draft banner wraps and buttons stay tappable.
- Remove obsolete `.semi-*` selectors from `frontend/src/index.css` when touching the related blocks.

## Out Of Scope

- New backend tables.
- A new document list data model.
- A new offline sync engine beyond local draft recovery.
- Full Draw.io protocol expansion. That remains Phase 3 unless a Phase 2 test exposes a regression.
- AI provider behavior changes beyond keeping AI disabled for viewers.

## Implementation Approach Options

### Recommended: State-First Hardening

Implement small state helpers and targeted UI changes in the existing components. This keeps the surface area small and matches the current code structure.

Tradeoff: `DocumentListPage.tsx` and `CollabEditor.tsx` remain large for now, but we avoid a risky component split before behavior is stable.

### Alternative: Extract Hooks First

Extract hooks such as `useDocumentListActions` and `useEditorSaveState` before changing UI behavior.

Tradeoff: cleaner boundaries, but more changed lines and higher regression risk before the current product states are fully covered.

### Alternative: E2E-Only Hardening

Add E2E assertions first and patch only what fails.

Tradeoff: very safe for known paths, but it may miss state inconsistencies that are hard to trigger through browser automation.

## Test Strategy

Every behavior change must start with a failing test.

Use Playwright E2E for user-visible behavior:

- Double-clicking New creates and opens one document.
- List load failure shows inline retry and retry reloads the current tab.
- Offline save shows local draft state and survives reload.
- Failed version save shows retrying/error copy, then recovers after the route resumes.
- Viewer sees read-only state and cannot open mutation menus.
- Mobile viewport keeps editor topbar controls non-overlapping.

Use backend Java tests only when a frontend scenario exposes an API permission or persistence bug.

Use focused checks before each commit:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
make backend-unit-test
```

Run the existing local E2E target when browser services are available:

```bash
make e2e-local
```

## Acceptance Criteria

Phase 2 is complete when current evidence proves:

- Document library create and mutation actions cannot accidentally duplicate requests.
- Document list failure has an inline retry path and does not masquerade as an empty list.
- Editor save status is accurate for saved, saving, local-only, retrying, error, and read-only states.
- Local drafts survive failed remote saves and reloads until saved or discarded.
- Collaboration and read-only state are visible and consistent with available actions.
- Mobile editor topbar and draft banner do not overlap at narrow widths.
- Ant Design remains the only frontend UI system; no Semi UI or lucide-react dependency is reintroduced.
- Relevant E2E, lint, build, Ant Design CLI, backend unit, and audit checks pass before commit.
