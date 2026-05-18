.PHONY: build-backend run-backend dev-frontend install-all

install-all:
	cd c2-frontend && pnpm install
	cd c2-backend && go mod tidy

build-backend:
	cd c2-backend && go build -o ../c2-server cmd/server/main.go

run-backend: build-backend
	./c2-server

dev-frontend:
	cd c2-frontend && pnpm dev

run-all:
	@echo "[*] Starting Tactical Environment..."
	@make -j2 run-backend dev-frontend
