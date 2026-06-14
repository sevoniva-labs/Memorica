.PHONY: \
	help \
	dev dev-down dev-logs setup clean demo-seed demo-seed-dry-run demo-seed-test dockerfile-policy-test docker-proxy-check \
	build ci lint test verify-local audit \
	backend-build backend-test backend-unit-test backend-integration-test backend-check backend-lint testcontainers-check \
	frontend-install frontend-dev frontend-build frontend-lint frontend-check frontend-audit e2e-local \
	hocuspocus-install hocuspocus-check hocuspocus-audit \
	db-migrate db-new-migration db-backup db-restore \
	docker-build docker-push

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Local Development ---

dev: ## Start all services in docker
	docker compose -f docker/docker-compose.yml up --build -d

dev-down: ## Stop all services
	docker compose -f docker/docker-compose.yml down

dev-logs: ## Tail all service logs
	docker compose -f docker/docker-compose.yml logs -f

demo-seed: ## Seed demo users, document, versions, diagram, attachment, and viewer sharing
	node scripts/seed-demo.mjs

demo-seed-dry-run: ## Show demo seed configuration without calling local services
	node scripts/seed-demo.mjs --dry-run

demo-seed-test: ## Test demo seed content generation without calling local services
	node --test scripts/seed-demo.test.mjs

dockerfile-policy-test: ## Verify Docker build policy and proxy diagnostics
	node --test scripts/dockerfile-policy.test.mjs scripts/docker-proxy-check.test.mjs

# --- Backend ---

backend-build: ## Build backend JAR
	cd backend && ./gradlew bootJar --no-daemon

backend-test: backend-unit-test ## Run backend unit tests

backend-unit-test: ## Run backend tests that do not require Testcontainers
	cd backend && JWT_SECRET=$${JWT_SECRET:-memorica-development-jwt-secret-2026-local-preview} ./gradlew test --no-daemon

testcontainers-check: ## Verify Docker is reachable before Testcontainers tests
	@docker info >/dev/null 2>&1 || { \
		echo "Docker is not reachable. Start Docker Desktop or Colima before running Testcontainers."; \
		echo "If Docker is running, check the active docker context and DOCKER_HOST."; \
		exit 1; \
	}

backend-integration-test: testcontainers-check ## Run backend Testcontainers-backed integration tests
	cd backend && JWT_SECRET=$${JWT_SECRET:-memorica-development-jwt-secret-2026-local-preview} ./gradlew integrationTest --no-daemon

backend-check: ## Run backend compile, tests, architecture, migration, and coverage checks
	cd backend && JWT_SECRET=$${JWT_SECRET:-memorica-development-jwt-secret-2026-local-preview} ./gradlew check --no-daemon

backend-lint: backend-check ## Alias for backend quality checks

# --- Frontend ---

frontend-install: ## Install frontend dependencies
	cd frontend && npm ci

frontend-dev: ## Start frontend dev server
	cd frontend && npm run dev

frontend-build: ## Build frontend for production
	cd frontend && npm run build

frontend-lint: ## Lint frontend
	cd frontend && npm run lint

frontend-check: ## Run frontend lint, Ant Design checks, and production build
	cd frontend && npm run lint && npm run antd:doctor && npm run antd:lint && npm run build

frontend-audit: ## Audit frontend production dependencies
	cd frontend && npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org

e2e-local: ## Run local E2E against already-running frontend, API, and collaboration services
	cd frontend && E2E_SKIP_WEB_SERVER=true \
		E2E_BASE_URL=http://localhost:5173 \
		E2E_API_BASE_URL=http://127.0.0.1:8080/api/v1 \
		E2E_BACKEND_HEALTH_URL=http://127.0.0.1:8080/actuator/health \
		npm run test:e2e -- editor-regression.spec.ts --workers=2

# --- Collaboration ---

hocuspocus-install: ## Install collaboration service dependencies
	cd hocuspocus && npm ci

hocuspocus-check: ## Check collaboration service syntax
	cd hocuspocus && node -c src/server.js && node -c src/db.js

hocuspocus-audit: ## Audit collaboration production dependencies
	cd hocuspocus && npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org

# --- Database ---

db-migrate: ## Run Flyway migrations
	cd backend && ./gradlew flywayMigrate --no-daemon

db-new-migration: ## Create a new Flyway migration (usage: make db-new-migration NAME=add_foo_table)
	@timestamp=$$(date +%Y%m%d%H%M%S); \
	cp backend/src/main/resources/db/migration/V001__init.sql \
	   backend/src/main/resources/db/migration/V$${timestamp}__$(NAME).sql; \
	echo "Created V$${timestamp}__$(NAME).sql"

# --- Docker ---

docker-build: ## Build all Docker images
	docker compose -f docker/docker-compose.yml build

docker-proxy-check: ## Inspect Docker image-pull proxy and stale container runtime proxy settings
	node scripts/docker-proxy-check.mjs

docker-push: ## Push Docker images to registry
	docker compose -f docker/docker-compose.yml push

# --- CI ---

build: backend-build frontend-build hocuspocus-check ## Build backend/frontend and validate collaboration syntax

audit: frontend-audit hocuspocus-audit ## Audit Node production dependencies

ci: backend-check frontend-check frontend-audit hocuspocus-check hocuspocus-audit ## Run full CI pipeline locally

lint: backend-lint frontend-lint hocuspocus-check ## Run all linters and syntax checks

test: backend-unit-test ## Run fast backend tests

verify-local: backend-unit-test frontend-check hocuspocus-check demo-seed-test dockerfile-policy-test audit ## Run local checks that do not require browser services

# --- Database ---

db-backup: ## Backup database to ./backups/
	./scripts/backup-db.sh

db-restore: ## Restore database from backup (usage: make db-restore FILE=backups/memorica_20260101_000000.sql.gz)
	gunzip -c $(FILE) | psql -h localhost -U memorica -d memorica

# --- Setup ---

setup: ## One-command local dev environment setup
	./scripts/dev-setup.sh

# --- Cleanup ---

clean: ## Clean build artifacts
	cd backend && ./gradlew clean --no-daemon
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite
