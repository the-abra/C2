package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/abra/c2-backend/internal/api"
	"github.com/abra/c2-backend/internal/api/handlers"
	"github.com/abra/c2-backend/internal/engine"
	"github.com/abra/c2-backend/internal/repository"
	"github.com/abra/c2-backend/internal/ws"
)

func main() {
	fmt.Println("[*] Starting C2 Tactical Backend (Go Edition - File Persistence)")

	dataDir := "data"
	_, err := repository.InitStore(dataDir)
	if err != nil {
		log.Fatalf("[-] Failed to initialize file store: %v", err)
	}
	fmt.Println("[+] File store initialized")

	hub := ws.NewHub()
	go hub.Run()
	fmt.Println("[+] WebSocket hub started")

	toolsDir := findToolsDir()
	fmt.Printf("[*] Loading tools from: %s\n", toolsDir)
	err = engine.LoadTools(toolsDir)
	if err != nil {
		fmt.Printf("[!] Warning: Failed to load some tools: %v\n", err)
	} else {
		fmt.Println("[+] Tools loaded and synced")
	}

	execEngine := engine.NewExecutionEngine(hub)

	apiHandlers := handlers.NewAPIHandlers(execEngine, hub)
	router := api.SetupRouter(apiHandlers, hub)

	port := os.Getenv("PORT")
	if port == "" {
		port = "1453"
	}

	fmt.Printf("[*] C2 Tactical Backend listening on :%s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("[-] Server failed: %v", err)
	}
}

func findToolsDir() string {
	paths := []string{"../../tools", "../../../tools", "./tools"}
	for _, p := range paths {
		abs, _ := filepath.Abs(p)
		if _, err := os.Stat(abs); err == nil {
			return abs
		}
	}
	return "./tools"
}
