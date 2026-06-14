# Memorica Pre-Release Checklist

This checklist is the working gate for turning Memorica from a local preview into a demoable pre-release build. Keep it current as features land.

## Release Scope

- Login, refresh token, logout, and the local demo account work.
- Document library covers owned, recent, favorite, shared, public, trash, folders, search, and empty/error states.
- Editor supports title/body editing, collaborative status, autosave, manual save, local draft recovery, attachments, Draw.io, version history, sharing, and readonly viewing.
- Permission behavior is consistent between frontend affordances and backend APIs.
- Local development uses `http://localhost:5173` as the preferred frontend URL; `127.0.0.1:5173` remains supported for tooling.
- Frontend UI remains Ant Design 5 / ProComponents / `@ant-design/icons`; do not reintroduce Semi UI, lucide-react, or a new UI system.

## Demo Account

Use this account for local demo checks:

- Username: `demo`
- Password: `Memorica2026`

Before a demo, confirm the account can log in. If the local database was recreated and the account is missing, create it through the registration UI or API:

```bash
make demo-seed-dry-run
make demo-seed
```

The seed command uses the public API to ensure `demo` and `demo_viewer` exist, create or reuse `Memorica 预发布演示文档`, upload a PDF attachment, save two versions with Draw.io content, and grant `demo_viewer` readonly access. If the API reports that users already exist, the script logs in with the configured passwords and continues.

If you only need to recreate the account manually, use:

```bash
curl -X POST http://127.0.0.1:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","email":"demo@memorica.local","password":"Memorica2026"}'
```

## Three-Minute Demo Script

1. Log in as `demo` and open `http://localhost:5173`.
2. Create a new document from the library and rename the title.
3. Type a short paragraph, wait for the save indicator to show saved, then reload to prove persistence.
4. Insert a Draw.io diagram from a template, save it, then rename or duplicate the diagram block.
5. Upload a small PDF attachment and open it from the document.
6. Share the document with another user as viewer, log in as that user, and show readonly mode: no edit tools, no upload, no AI, no restore action.
7. Return as owner, open version history, preview an older version, restore it, and confirm the editor creates a new saved version.

## Required Local Services

Use `make dev` for the normal local stack, or start services separately:

```bash
cd backend && JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew bootRun
cd hocuspocus && npm start
cd frontend && npm run dev -- --host 0.0.0.0 --port 5173
```

Required dependencies:

- PostgreSQL 16
- Redis 7
- MinIO
- Backend API on `http://127.0.0.1:8080`
- Hocuspocus WebSocket on `ws://127.0.0.1:1234`
- Frontend on `http://localhost:5173`

## Verification Gates

Run these before labeling a branch as pre-release ready:

```bash
cd frontend && npm run lint
cd frontend && npm run build
cd frontend && npm run antd:doctor
cd frontend && npm run antd:lint
make audit
cd backend && JWT_SECRET=memorica-development-jwt-secret-2026-local-preview ./gradlew test
```

For the main end-to-end path, start the local frontend, backend, Hocuspocus, PostgreSQL, Redis, and MinIO first, then run:

```bash
cd frontend
E2E_SKIP_WEB_SERVER=true \
E2E_BASE_URL=http://localhost:5173 \
E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
npm run test:e2e -- editor-regression.spec.ts --workers=2
```

To refresh the demo document and then run the seeded demo account checks plus the same main E2E gate from the repository root, use:

```bash
make demo-e2e-local
```

If Docker/Testcontainers is available, also run:

```bash
make testcontainers-check
make backend-integration-test
```

For the current Cloudflare path, deploy the frontend to Cloudflare Pages and keep the API/WebSocket services on an external HTTPS origin or Cloudflare Tunnel. See [docs/cloudflare-pages.md](cloudflare-pages.md), then run:

```bash
make cloudflare-pages-policy-test
VITE_API_BASE_URL=https://api.example.com VITE_WS_URL=wss://api.example.com/ws VITE_DRAWIO_URL=https://embed.diagrams.net/ make cloudflare-pages-preflight
```

## Permission Matrix Checks

- Owner can rename, edit content, upload, use AI, insert/edit Draw.io, share, revoke access, publish, delete, restore, and restore versions.
- Editor can rename and edit content, upload, use AI, insert/edit Draw.io, and save versions.
- Editor cannot manage sharing, publish/unpublish, remove owner, delete, or restore deleted documents.
- Viewer can open shared documents, attachments, diagrams, and version previews where allowed.
- Viewer cannot edit title/body, save versions, upload, use AI, edit diagrams, restore versions, or manage sharing.
- Unauthenticated users cannot access private documents or private file URLs.

## External-Service Risks

- `npm audit` uses `https://registry.npmjs.org` because npmmirror does not provide a stable audit endpoint; dependency install still uses the repository `.npmrc` domestic mirror.
- Draw.io defaults to `https://embed.diagrams.net/`; for domestic networks or production, prefer a self-hosted diagrams.net service and set `VITE_DRAWIO_URL`.
- If Draw.io reports `invalid stored block lengths`, run `make drawio-diagnostics` first to separate committed template corruption from saved-document XML/export corruption or intranet access issues.
- DeepSeek AI is optional for core tests. Leaving `DEEPSEEK_API_KEY` empty is the local disabled state; provider-backed checks should stay opt-in with `E2E_RUN_AI=true`.
- Never commit real AI keys. Production should inject `DEEPSEEK_API_KEY` through deployment secrets, and domestic-network deployments may point `DEEPSEEK_BASE_URL` at a trusted gateway.
- MinIO presigned file URLs should stay short-lived. `FILE_URL_EXPIRY_MINUTES` is clamped to 1-60 minutes by the backend; keep production values near the 15 minute default unless there is a documented operational need.

## Pre-Release Sign-Off

Record the final evidence in the release notes:

- Branch and latest commit hash.
- Verification commands and pass/fail results.
- E2E run command and result.
- Backend integration result or the exact Docker/Testcontainers blocker.
- Known risks that remain.
- Rollback notes for database migrations and configuration changes.
