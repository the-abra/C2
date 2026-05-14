#!/bin/bash

# C2 Command Center - Integrated Entrypoint
# This script builds the frontend, backend, and starts the system.

set -e

echo "🚀 Starting C2 Build Process..."

# 1. Build Frontend
echo "📦 Building Frontend..."
cd c2-frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd ..

# 2. Build Backend
echo "🏗️ Building Backend..."
cd c2-backend
go mod tidy
go build -o c2-server ./cmd/server/main.go
cd ..

# 3. Launch System
echo "🛡️ Launching C2 Command Center..."
echo "Note: Port 80 requires sudo privileges."

# Check if port 80 is occupied
if lsof -Pi :80 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Warning: Port 80 is already in use. Please clear it first."
    exit 1
fi

cd c2-backend
sudo ./c2-server
