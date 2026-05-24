.PHONY: help dev dev-down build test lint clean db-backup db-restore setup

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Local Development ---

dev: ## Start all services in docker
	docker compose -f docker/docker-compose.yml up --build -d

dev-down: ## Stop all services
	docker compose -f docker/docker-compose.yml down

dev-logs: ## Tail all service logs
	docker compose -f docker/docker-compose.yml logs -f

# --- Backend ---

backend-build: ## Build backend JAR
	cd backend && ./gradlew bootJar --no-daemon

backend-test: ## Run backend tests
	cd backend && ./gradlew test --no-daemon

backend-check: ## Run backend compile, tests, architecture, migration, and coverage checks
	cd backend && ./gradlew check --no-daemon

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

frontend-audit: ## Audit frontend production dependencies
	cd frontend && npm audit --omit=dev --audit-level=high

# --- Collaboration ---

hocuspocus-install: ## Install collaboration service dependencies
	cd hocuspocus && npm ci

hocuspocus-check: ## Check collaboration service syntax
	cd hocuspocus && node -c src/server.js && node -c src/db.js

hocuspocus-audit: ## Audit collaboration production dependencies
	cd hocuspocus && npm audit --omit=dev --audit-level=high

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

docker-push: ## Push Docker images to registry
	docker compose -f docker/docker-compose.yml push

# --- CI ---

ci: backend-check frontend-lint frontend-build frontend-audit hocuspocus-check hocuspocus-audit ## Run full CI pipeline locally

lint: backend-lint frontend-lint hocuspocus-check ## Run all linters and syntax checks

test: backend-test ## Run all tests

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
