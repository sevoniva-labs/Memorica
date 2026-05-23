# Memorica

Real-time collaborative document editor. Multi-user simultaneous editing with cursor presence, selection sync, and live content updates — built on a production-grade foundation.

## Architecture

```
                    ┌──────────┐
                    │  Browser │
                    └────┬─────┘
                         │
              ┌──────────┴──────────┐
              │    Nginx :80/:443   │  ← TLS termination, rate limiting, WebSocket upgrade
              └──────────┬──────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
  ┌────┴────┐      ┌─────┴─────┐    ┌──────┴──────┐
  │  React  │      │ Spring    │    │ Hocuspocus  │
  │  SPA    │      │ Boot API  │    │ WS × N      │
  │  :80    │      │ :8080     │    │ :1234       │
  └─────────┘      └─────┬─────┘    └──────┬──────┘
                         │                 │
              ┌──────────┼──────────┐      │
              │          │          │      │
         ┌────┴───┐ ┌───┴────┐ ┌───┴──┐ ┌─┴───┐
         │Postgres│ │ Redis  │ │MinIO │ │Redis│
         │   :5432│ │  :6379 │ │ :9000│ │pub/ │
         └────────┘ └────────┘ └──────┘ │sub  │
                                        └─────┘

Data flows:
  REST:  Browser → Nginx → Spring Boot → PostgreSQL / Redis / MinIO
  Real-time: Browser ↔ Nginx (WS upgrade) ↔ Hocuspocus ↔ Redis pub/sub ↔ Postgres (persist)
  Collab sync: Yjs CRDT → Hocuspocus → Redis pub/sub → other Hocuspocus instances → other users
```

## Project Structure

```
Memorica-docs/
├── backend/                          # Spring Boot 3.5 REST API
│   ├── src/main/java/sevoniva/memorica/
│   │   ├── config/                   # Security, MinIO, Redis, Cache, Async, Scheduling, Metrics, Health
│   │   ├── controller/               # Auth, Document, File controllers (/api/v1/)
│   │   ├── dto/                      # Request/response DTOs with Jakarta validation
│   │   ├── entity/                   # User, Document, DocumentVersion, DocumentPermission, AuditLog
│   │   ├── exception/                # GlobalExceptionHandler + custom exceptions
│   │   ├── repository/               # Spring Data JPA repos with pagination
│   │   ├── security/                 # JWT filter, JwtUtil (dual token), UserDetails
│   │   ├── service/                  # Auth, Document, File, Permission, Audit, TokenBlacklist
│   │   ├── task/                     # Scheduled cleanup tasks
│   │   └── util/                     # Input sanitization
│   ├── src/main/resources/
│   │   ├── application.yml           # All values via ${ENV_VAR}
│   │   ├── application-dev.yml       # Dev overrides
│   │   ├── application-prod.yml      # Prod overrides (graceful shutdown, Tomcat tuning)
│   │   ├── logback-spring.xml        # JSON structured logging + traceId
│   │   └── db/migration/             # Flyway migrations (V001-V003)
│   ├── src/test/                     # 20 tests: unit + ArchUnit + integration (Testcontainers)
│   ├── Dockerfile                    # Multi-stage: jdk-alpine → jre-alpine
│   └── build.gradle
├── frontend/                         # React 19 + Tiptap editor
│   ├── src/
│   │   ├── api/client.ts             # Axios with X-Trace-Id, access/refresh tokens
│   │   ├── stores/authStore.ts       # Zustand auth state (checkAuth, refresh, logout)
│   │   ├── components/               # CollabEditor, Toolbar, BubbleMenu, SlashMenu, AI, FindReplace
│   │   └── pages/                    # Login, DocumentList, Editor, VersionHistory
│   ├── e2e/                          # Playwright smoke tests
│   ├── Dockerfile                    # Multi-stage: node → nginx-alpine
│   ├── nginx.conf                    # SPA with CSP, HSTS-ready, security headers
│   ├── .env.development / .env.production
│   └── playwright.config.ts
├── hocuspocus/                       # WebSocket collaboration server
│   ├── src/
│   │   ├── server.js                 # Redis pub/sub, room permissions, connection limits
│   │   └── db.js                     # PostgreSQL pool + checkDocumentAccess
│   ├── Dockerfile                    # node:22-alpine
│   └── .env.example
├── docker/
│   ├── docker-compose.yml            # Local dev: postgres + redis + minio + all services
│   ├── docker-compose.prod.yml       # Prod overrides (replicas, resource limits)
│   ├── nginx/nginx.conf              # Reverse proxy: rate limiting, JSON logging, WS upgrade
│   ├── prometheus/                   # Prometheus config + alert rules
│   ├── grafana/dashboards/           # Memorica Overview dashboard
│   └── postgres/init/
├── k8s/                              # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml + secret
│   ├── deployment.yaml               # API (2×), Hocuspocus (2×), Frontend (2×)
│   └── service.yaml                  # ClusterIP for internal routing
├── .github/
│   ├── workflows/ci.yml              # CI: backend lint→test, frontend lint→build
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
├── scripts/
│   ├── dev-setup.sh                  # One-command local env bootstrap
│   └── backup-db.sh                  # PostgreSQL backup with retention
├── Makefile                          # make dev, test, lint, db-backup, setup
├── .editorconfig
└── .env.example                      # All environment variables with defaults
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 3, Tiptap v3 |
| Real-time | Yjs 13 (CRDT), Hocuspocus 4 (WebSocket), Redis pub/sub |
| Backend | Spring Boot 3.5, Java 21, Spring Security, Spring Data JPA |
| Auth | JWT (jjwt 0.12), Access 15min + Refresh 7d, Redis blacklist |
| Database | PostgreSQL 16, Flyway migrations, HikariCP |
| Cache | Redis 7 (token blacklist, Spring Cache, Hocuspocus pub/sub) |
| Storage | MinIO (S3-compatible) |
| Observability | Actuator, Prometheus, Micrometer, JSON structured logging, traceId |
| Resilience | Resilience4j (circuit breaker, retry), graceful shutdown |
| Container | Docker, docker-compose, Kubernetes manifests |
| CI/CD | GitHub Actions |
| Testing | JUnit 5, Mockito, ArchUnit, Testcontainers, Playwright |
| Docs | SpringDoc OpenAPI / Swagger UI |

## Quick Start

### Prerequisites

- Java 21, Node.js 22, Docker

### One-command setup

```bash
./scripts/dev-setup.sh
```

### Manual setup

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Start infrastructure + all services
make dev

# Or start individual services:
cd backend && ./gradlew bootRun       # API at :8080
cd hocuspocus && npm start            # WebSocket at :1234
cd frontend && npm run dev            # SPA at :5173
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Actuator | http://localhost:8080/actuator/health |
| Prometheus metrics | http://localhost:8080/actuator/prometheus |
| MinIO Console | http://localhost:9001 |
| Hocuspocus | ws://localhost:1234 |

## Configuration

All configuration is via environment variables. See `.env.example` for the full list.

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `jdbc:postgresql://localhost:5432/collab` | PostgreSQL JDBC URL |
| `DB_USERNAME` / `DB_PASSWORD` | — | Database credentials |
| `JWT_SECRET` | — | HMAC-SHA256 signing key (min 256 bits) |
| `JWT_ACCESS_EXPIRATION` | `900000` | Access token TTL (ms) |
| `JWT_REFRESH_EXPIRATION` | `604800000` | Refresh token TTL (ms) |
| `MINIO_ENDPOINT` | `http://localhost:9000` | S3-compatible endpoint |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis connection |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated origins |
| `FILE_MAX_SIZE` | `10485760` | Max upload size (bytes) |
| `FILE_ALLOWED_TYPES` | `image/jpeg,image/png,...` | Allowed MIME types |

Application profiles:
- `dev` (default): SQL logging, debug levels
- `prod`: WARN logging, Tomcat tuning, restricted health details, graceful shutdown

## Development

```bash
make help          # Show all commands

make dev           # Start all services in Docker
make dev-down      # Stop all services
make test          # Run backend + frontend tests
make lint          # Run all linters
make db-backup     # Backup PostgreSQL to ./backups/
make db-migrate    # Run Flyway migrations

# Backend
cd backend
./gradlew test                       # Run all tests (20)
./gradlew bootRun                    # Start API

# Frontend
cd frontend
npm run dev                          # Dev server
npm run build                        # Production build
npm run lint                         # ESLint
npx playwright test                  # E2E tests
```

## Testing

**20 tests, 0 failures**

| Category | Count | Framework | Description |
|----------|-------|-----------|-------------|
| Unit | 9 | JUnit 5 + Mockito | AuthService, DocumentService (register, login, CRUD, ownership, permissions) |
| Architecture | 6 | ArchUnit | Package location, dependency direction, layered architecture enforcement |
| Integration | 5 | Testcontainers + PostgreSQL | Real DB: User + Document repository CRUD, pagination, public docs query |
| E2E | 4 | Playwright | Login page, form toggle, validation, route guard |

```bash
# Run all
cd backend && ./gradlew test

# Run specific categories
./gradlew test --tests "*AuthServiceTest*"
./gradlew test --tests "*ArchitectureTest*"
./gradlew test --tests "*RepositoryIntegrationTest*"
```

## Deployment

### Docker Compose

```bash
# Development
docker compose -f docker/docker-compose.yml up -d

# Production
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
```

### Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Production deployments use:
- Rolling updates with `maxUnavailable: 0` for API and Hocuspocus
- startup/liveness/readiness probes on all services
- Resource requests and limits configured per service

## Monitoring

- **Health**: `/actuator/health` (liveness, readiness, DB probe)
- **Metrics**: `/actuator/prometheus` (JVM, HTTP, HikariCP, business gauges)
- **Logging**: JSON structured logs with traceId, log rotation (100MB × 30 days, 3GB cap)
- **Alerts**: 5 Prometheus rules (health, error rate, P95 latency, heap, connection pool)
- **Dashboard**: Grafana `memorica-overview` (request rate, errors, latency, JVM, DB pool, business metrics)
- **Tracing**: `X-Trace-Id` header propagated Browser → API → Hocuspocus, returned in error responses

### Business metrics (refreshed every 60s)

- `memorica_users_total` — registered users
- `memorica_documents_total` — active documents
- `memorica_versions_total` — total version snapshots
- `memorica_health` — 1 = UP, 0 = DOWN

## API

Base path: `/api/v1/`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | No | Rotate refresh token |
| POST | `/auth/logout` | Yes | Revoke access token |
| GET | `/auth/me` | Yes | Current user info |
| GET | `/documents/my` | Yes | My documents (paged) |
| GET | `/documents/public` | Yes | Public documents (paged) |
| GET | `/documents/{id}` | Yes | Get document |
| POST | `/documents` | Yes | Create document |
| PUT | `/documents/{id}` | Yes | Update title/visibility |
| DELETE | `/documents/{id}` | Yes | Delete document (owner only) |
| POST | `/documents/{id}/versions` | Yes | Save version snapshot |
| GET | `/documents/{id}/versions` | Yes | List versions (paged) |
| GET | `/documents/versions/{vId}` | Yes | Get version detail |
| POST | `/files/upload` | Yes | Upload file (type/size validated) |
| GET | `/files/view/{name}` | No | Get presigned URL |

Full API documentation: http://localhost:8080/swagger-ui.html

## Database

3 Flyway migrations managing 6 tables:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (with @Version optimistic locking) |
| `documents` | Document metadata (with @Version) |
| `document_permissions` | Access control (owner/editor/viewer per user) |
| `document_versions` | Explicit snapshots (unique constraint on doc+version) |
| `document_states` | Yjs CRDT binary state (Hocuspocus persistence) |
| `audit_log` | Security audit trail (async write, 1-year retention) |

All tables have appropriate indexes. Soft delete via `deleted_at` on users and documents.

## Security

- All credentials via environment variables (never in source)
- JWT dual-token: Access (15min) + Refresh (7d) with type validation
- Token revocation via Redis blacklist (TTL-aligned)
- BCrypt(password, cost=12), minimum 8 chars with upper+lower+digit
- CORS origin whitelist from config
- Document ownership + permission checks at service layer
- File upload: size limit, MIME type whitelist, random filenames (no path traversal)
- CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Referrer-Policy headers
- Input sanitization utilities for XSS prevention
- Rate limiting at nginx level (auth: 5/min, API: 60/min)
- @Version optimistic locking on all entities
- Audit log for compliance tracking
- HSTS-ready (enable with TLS certificate)

## License

MIT
