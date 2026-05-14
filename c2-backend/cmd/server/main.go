package main

import (
	"c2-backend/internal/api"
	"c2-backend/internal/core"
	"c2-backend/internal/db"
	"c2-backend/internal/ws"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

func main() {
	// 1. Setup paths
	baseDir, _ := os.Getwd()
	dataDir := filepath.Join(baseDir, "data")
	dbPath := filepath.Join(dataDir, "c2.sqlite")

	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// 2. Initialize Database
	database, err := db.InitDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	store := db.NewStore(database)

	// 3. Initialize Core Components
	engine := core.NewEngine()
	evidence := core.NewEvidenceManager(dataDir)
	hub := ws.NewHub()

	// 4. Start WebSocket Hub
	go hub.Run()

	// 5. Initialize API Handler
	handler := api.NewHandler(store, engine, evidence, hub)

	// 6. Setup Router
	router := api.NewRouter(handler)

	// 7. Start Frontend Server (Port 80)
	frontendPath := "../c2-frontend/out"
	go func() {
		addr := ":80"
		log.Printf("Frontend Server starting on http://localhost (Port 80)")
		fs := http.FileServer(http.Dir(frontendPath))
		if err := http.ListenAndServe(addr, fs); err != nil {
			log.Printf("Frontend Server (Port 80) failed: %v", err)
			log.Printf("TIP: You might need 'sudo' to listen on port 80.")
		}
	}()

	// 8. Start API Server (Port 1453)
	apiAddr := "127.0.0.1:1453"
	log.Printf("API Server starting on http://%s", apiAddr)
	
	apiServer := &http.Server{
		Addr:    apiAddr,
		Handler: router,
	}

	if err := apiServer.ListenAndServe(); err != nil {
		log.Fatalf("API Server failed: %v", err)
	}
}
