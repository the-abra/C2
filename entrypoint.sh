#!/bin/bash

# C2 Command Center - Integrated Entrypoint
# This script builds the frontend, backend, and starts the system.

set -e

# Flags
QUICK=false
for arg in "$@"; do
    if [ "$arg" == "--quick" ]; then
        QUICK=true
    fi
done

echo "🚀 Starting C2 Build Process..."

# 1. Dependency Checks
command -v go >/dev/null 2>&1 || { echo >&2 "❌ Go is not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "❌ NPM is not installed. Aborting."; exit 1; }

# 2. Build Frontend
if [ "$QUICK" = true ] && [ -d "c2-frontend/out" ]; then
    echo "⏩ Skipping Frontend Build (--quick)"
else
    echo "📦 Building Frontend..."
    cd c2-frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run build
    cd ..
fi

# 3. Build Backend
echo "🏗️ Building Backend..."
cd c2-backend
go mod tidy
go build -o c2-server ./cmd/server/main.go
cd ..

# 4. Launch System
echo "🛡️ Launching C2 Command Center..."

# Check if port 80 is occupied
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Warning: Port 80 is already in use."
    # Try to kill if requested or just exit
fi

cd c2-backend
# Check if sudo is needed (for port 80)
if [ "$EUID" -ne 0 ]; then
    sudo ./c2-server
else
    ./c2-server
fi
