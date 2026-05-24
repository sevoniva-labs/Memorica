# Contributing to Memorica

Thank you for helping improve Memorica. This project aims to be production-grade, so every change should be understandable, tested, and safe to operate.

## Development Setup

1. Install Docker, Node.js 22, and Java 21.
2. Start dependencies and services:

```sh
make dev
```

3. Run local checks before opening a pull request:

```sh
make ci
cd frontend && npm run build
cd hocuspocus && node -c src/server.js && node -c src/db.js
```

For backend tests inside Docker on macOS, use:

```sh
docker run --rm \
  -e TESTCONTAINERS_RYUK_DISABLED=true \
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  -v "$PWD/backend:/workspace" \
  -v "$HOME/.gradle:/root/.gradle" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -w /workspace eclipse-temurin:21-jdk-alpine ./gradlew check --no-daemon
```

## Pull Request Standards

- Keep changes focused and explain the user or operator impact.
- Add or update tests for permission, migration, persistence, authentication, and deployment behavior.
- Never commit real secrets, tokens, database dumps, or production configuration.
- Keep REST API, Hocuspocus collaboration access, and file access aligned with the same permission model.
- Database changes must be Flyway migrations and must work against a clean PostgreSQL database.

## Code Style

- Backend code should follow the existing Spring package boundaries: controller, service, repository, entity, security, config, dto.
- Frontend code should keep TypeScript types explicit at API boundaries and avoid `any`.
- Infrastructure manifests should be valid without relying on local-only defaults.

## Review Expectations

Reviewers should prioritize security, data integrity, operability, and tests before UI polish or new features. A change that expands product capability but weakens the foundation should not merge.
