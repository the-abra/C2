#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[*] Initializing C2 Tactical Environment Setup...${NC}"

# 1. Build Frontend (Static Export)
echo -e "${GREEN}[+] Building Frontend (Static Export)...${NC}"
cd c2-frontend
pnpm install
pnpm build
cd ..

# 2. Build Backend
echo -e "${GREEN}[+] Building Go Backend...${NC}"
cd c2-backend
go mod tidy
go build -o ../c2-server cmd/server/main.go
cd ..

# 3. Run Services
echo -e "${BLUE}[*] Starting Services...${NC}"

# Trap SIGINT to kill background processes cleanly when stopping the script
trap 'echo -e "\n${BLUE}[*] Shutting down services...${NC}"; kill 0' SIGINT

echo -e "${GREEN}[+] Serving Frontend on http://localhost:8080${NC}"
# Use npx serve for production-ready static file serving
npx serve -s c2-frontend/out -p 8080 &

echo -e "${GREEN}[+] Starting Go Backend on http://localhost:1453${NC}"
./c2-server &

echo -e "${BLUE}[*] Environment is LIVE. Press Ctrl+C to shutdown.${NC}"

# Wait for background processes to keep script running
wait
