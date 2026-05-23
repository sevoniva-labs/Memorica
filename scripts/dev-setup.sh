#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Memorica Development Environment Setup
# ──────────────────────────────────────────────────────────────────────────────
# Prerequisites: Homebrew, Docker Desktop or Colima
# Usage: ./scripts/dev-setup.sh
# ──────────────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Memorica Dev Setup ==="

# --- Java ---
if ! java -version 2>/dev/null | grep -q "21"; then
    echo "[1/6] Installing Java 21..."
    brew install openjdk@21
    echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@21' >> ~/.zshrc
    echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
    export JAVA_HOME=/opt/homebrew/opt/openjdk@21
    export PATH="$JAVA_HOME/bin:$PATH"
else
    echo "[1/6] Java 21 ✓"
fi

# --- Node ---
if ! command -v node &>/dev/null; then
    echo "[2/6] Installing Node.js via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install 22
else
    echo "[2/6] Node $(node -v) ✓"
fi

# --- Docker ---
if ! command -v docker &>/dev/null; then
    echo "[3/6] Installing Docker (Colima)..."
    brew install colima docker docker-compose
    colima start --cpu 4 --memory 8
else
    echo "[3/6] Docker ✓"
fi

# --- Environment ---
if [ ! -f .env ]; then
    echo "[4/6] Creating .env from .env.example..."
    cp .env.example .env
    echo "  → Edit .env with your settings"
else
    echo "[4/6] .env ✓"
fi

# --- Frontend deps ---
echo "[5/6] Installing frontend dependencies..."
cd frontend && npm ci --legacy-peer-deps && cd ..

# --- Hocuspocus deps ---
echo "[5/6] Installing hocuspocus dependencies..."
cd hocuspocus && npm ci --legacy-peer-deps && cd ..

# --- Backend build ---
echo "[6/6] Building backend..."
cd backend && ./gradlew compileJava --no-daemon && cd ..

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Start all services:   make dev"
echo "Start frontend only:  make frontend-dev"
echo "Run tests:            make test"
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8080"
echo "  Swagger:   http://localhost:8080/swagger-ui.html"
echo "  MinIO:     http://localhost:9001"
echo "  Hocuspocus: ws://localhost:1234"
