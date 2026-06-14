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

## Runtime Environment

Set these Cloudflare Pages environment variables in both preview and production:

```bash
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_WS_URL=wss://api.example.com/ws
VITE_DRAWIO_URL=https://embed.diagrams.net/
```

For domestic networks or production demos, prefer a self-hosted diagrams.net endpoint and set `VITE_DRAWIO_URL` to that internal or trusted URL.

Keep the frontend on `https://<project>.pages.dev` or your custom domain, and make the API/WebSocket endpoint a separate HTTPS origin. The backend CORS configuration must explicitly allow the Pages production and preview origins.

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
