# Cloudflare Pages Deployment

This guide prepares Memorica for a practical free-tier Cloudflare path: deploy the React frontend to Cloudflare Pages first, then connect it to an existing HTTPS backend. It does not move the current backend stack into Workers.

## What Can Run On Pages Now

The `frontend` app is a Vite SPA and can run on Cloudflare Pages as static assets.

Use these Pages build settings:

- Root directory: `frontend`
- Build command: `npm ci --registry=https://registry.npmmirror.com && npm run build`
- Output directory: `dist`
- Node version: `22`

For direct uploads with Wrangler:

```bash
cd frontend
npm ci --registry=https://registry.npmmirror.com
npm run build
npx wrangler pages deploy dist --project-name memorica-frontend
```

The source-controlled `frontend/wrangler.jsonc` records the Pages project name and build output directory for local direct deploys.

## GitHub Actions Deployment

The repository includes `.github/workflows/cloudflare-pages.yml` for deploying the frontend to Cloudflare Pages from GitHub Actions. It runs on pushes to `main` and `feat/pre-release-hardening`, and can also be started manually with `workflow_dispatch`.

Required GitHub repository variable:

```text
CLOUDFLARE_ACCOUNT_ID=12795078d01f49d69370b3e7efa7ea60
```

Required GitHub repository secret:

```text
CLOUDFLARE_API_TOKEN=<Cloudflare token with Account / Pages Write on this account>
```

Optional GitHub repository variables:

```text
CLOUDFLARE_PAGES_PROJECT_NAME=memorica-frontend
CLOUDFLARE_PAGES_BRANCH=main
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_WS_URL=wss://api.example.com/ws
VITE_DRAWIO_URL=https://embed.diagrams.net/
```

The workflow installs frontend dependencies with `https://registry.npmmirror.com`, runs lint and build, then deploys `frontend/dist` with Wrangler. Set `CLOUDFLARE_PAGES_BRANCH=main` when a development branch should update the Pages production temporary domain. If `VITE_API_BASE_URL` and `VITE_WS_URL` are empty, the Pages deployment will still serve the static frontend, but login, API calls, file access, and collaboration will not be usable until a public HTTPS/WSS backend is configured.

## Current Project

Cloudflare Pages project `memorica-frontend` has been created on the connected account with the temporary domain:

```text
https://memorica-frontend-5ut.pages.dev
```

At the time this runbook was added, the project had no successful deployment yet. Direct upload still requires a local Wrangler session (`npx wrangler login`) or a scoped API token, then:

```bash
cd frontend
npm ci --registry=https://registry.npmmirror.com
npm run build
npx wrangler whoami
npx wrangler pages deploy dist --project-name memorica-frontend
```

Before uploading, run the deployment preflight with the public backend values that will be compiled into the Pages build:

```bash
VITE_API_BASE_URL=https://api.example.com \
VITE_WS_URL=wss://api.example.com/ws \
VITE_DRAWIO_URL=https://embed.diagrams.net/ \
make cloudflare-pages-build
```

If `VITE_API_BASE_URL` or `VITE_WS_URL` is empty, the app can still build, but the deployed Pages site will call its own `/api/v1` and `/ws` paths. That is not usable until those paths are backed by a public HTTPS/WSS backend or a Cloudflare Tunnel origin.

## Runtime Environment

Set these Cloudflare Pages environment variables in both preview and production:

```bash
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_WS_URL=wss://api.example.com/ws
VITE_DRAWIO_URL=https://embed.diagrams.net/
```

For domestic networks or production demos, prefer a self-hosted diagrams.net endpoint and set `VITE_DRAWIO_URL` to that internal or trusted URL.

Keep the frontend on `https://<project>.pages.dev` or your custom domain, and make the API/WebSocket endpoint a separate HTTPS origin. The backend CORS configuration must explicitly allow the Pages production and preview origins.

For the Spring Boot API, keep exact production domains in `CORS_ALLOWED_ORIGINS` and use `CORS_ALLOWED_ORIGIN_PATTERNS` only for controlled wildcard preview domains:

```bash
CORS_ALLOWED_ORIGINS=https://memorica.example.com
CORS_ALLOWED_ORIGIN_PATTERNS=https://*.pages.dev
```

Do not use `*` with credentialed requests. The frontend stores JWTs in browser storage and sends authenticated API calls, so the API should echo only trusted origins.

## SPA Routing

Do not add a top-level `frontend/public/404.html` unless you also add an explicit fallback strategy. Cloudflare Pages treats a project without a top-level `404.html` as a single-page application and serves the root app for routes such as `/doc/:id` and `/doc/:id/versions`.

## Backend Boundary

The current runtime is:

```text
Spring Boot + PostgreSQL + Redis + MinIO + Hocuspocus
```

That stack cannot be deployed unchanged to Workers free tier. Workers can run edge JavaScript/TypeScript, but this backend currently needs a JVM service, Postgres, Redis pub/sub, S3-compatible object storage, and a long-lived Hocuspocus WebSocket process.

Practical paths:

- Short term: deploy only `frontend` to Cloudflare Pages and keep the backend on Docker Compose, a VPS, Kubernetes, or another managed host.
- Demo/private access: expose the existing backend through Cloudflare Tunnel, then point `VITE_API_BASE_URL` and `VITE_WS_URL` at the tunneled HTTPS origin.
- Later rewrite: move API slices to Workers, relational data to D1, files to R2, and collaboration state/presence to Durable Objects. This is a product architecture change and should be planned separately.

## Pre-Deploy Checklist

- Run `make frontend-check`.
- Run the local E2E gate against `http://localhost:5173`.
- Confirm `demo / Memorica2026` still logs in locally.
- Confirm the production API origin allows the Pages domain in CORS.
- Confirm `VITE_WS_URL` uses `wss://` in production.
- Confirm no real secrets are stored in Vite variables. Vite env vars are compiled into browser assets.

## Useful References

- Cloudflare Pages React guide: `https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/`
- Cloudflare Pages SPA serving behavior: `https://developers.cloudflare.com/pages/configuration/serving-pages/`
- Cloudflare Pages Wrangler configuration: `https://developers.cloudflare.com/pages/functions/wrangler-configuration/`
