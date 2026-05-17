#!/bin/bash

# Hellish Duelist C2 - Professional Cleanup Script
# This script prepares the project for GitHub upload by removing all local data,
# build artifacts, and temporary files.

echo "[*] Starting professional cleanup..."

# 1. Clean Frontend
echo "[*] Cleaning frontend artifacts..."
rm -rf c2-frontend/node_modules
rm -rf c2-frontend/.next
rm -rf c2-frontend/out
rm -rf c2-frontend/.turbo
rm -f c2-frontend/package-lock.json

# 2. Clean Backend & Evidence
echo "[*] Cleaning backend data & evidence..."
rm -f c2-backend/data/c2.sqlite
rm -f data/c2.sqlite
rm -rf targets/*
rm -rf uploads/*
rm -f c2-backend/c2-server
rm -f c2-backend/server
rm -f c2-server
rm -f server

# Recreate gitkeeps to ensure git tracking
echo "# Keep directory" > data/.gitkeep
echo "# Keep directory" > targets/.gitkeep
echo "# Keep directory" > uploads/.gitkeep

# 3. Clean Root
echo "[*] Cleaning root directory..."
rm -f mass_test.sh
rm -f *.log
rm -f *.txt
rm -rf scratch/

# 4. Success message
echo "[+] Cleanup complete. The project is ready for 'git add . && git commit'"
echo "[!] NOTE: If you see 'Permission denied', run this script with sudo: sudo ./scripts/cleanup.sh"
