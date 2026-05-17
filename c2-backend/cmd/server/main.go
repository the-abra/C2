package main

import (
	"bytes"
	"c2-backend/internal/ai"
	"c2-backend/internal/api"
	"c2-backend/internal/core"
	"c2-backend/internal/db"
	"c2-backend/internal/ws"
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	batchMode := flag.Bool("batch", false, "Run in batch mode without starting web servers")
	batchTool := flag.String("tool", "", "Tool to run in batch mode")
	batchScenario := flag.String("scenario", "", "Scenario name to run in batch mode")
	batchTarget := flag.String("target", "", "Target for batch mode")
	batchSession := flag.String("session", "batch-session", "Session name for batch mode")
	flag.Parse()

	// 1. Setup paths
	baseDir, _ := os.Getwd()
	
	// If running from inside c2-backend, move up to project root
	if filepath.Base(baseDir) == "c2-backend" {
		baseDir = filepath.Dir(baseDir)
	}

	dataDir := filepath.Join(baseDir, "data")
	dbPath := filepath.Join(dataDir, "c2.sqlite")

	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	// Ensure targets and uploads exist at root
	os.MkdirAll(filepath.Join(baseDir, "targets"), 0755)
	os.MkdirAll(filepath.Join(baseDir, "uploads"), 0755)

	// 2. Initialize Database
	toolsDir := filepath.Join(baseDir, "tools")
	database, err := db.InitDB(dbPath, toolsDir)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	store := db.NewStore(database)

	// 3. Initialize Core Components
	engine := core.NewEngine()
	evidence := core.NewEvidenceManager(baseDir)
	hub := ws.NewHub()
	aiClient := ai.NewClient()
	parser := core.NewParser(store)

	// 4. Initialize Orchestrator & Recovery
	orchestrator := core.NewJobOrchestrator(engine, store, evidence, hub, aiClient, 5) // Max 5 workers
	orchestrator.RecoverState()

	if *batchMode {
		if (*batchTool == "" && *batchScenario == "") || *batchTarget == "" {
			log.Fatalf("Batch mode requires (-tool or -scenario) and -target flags")
		}

		fmt.Printf("[*] Starting Batch Mode for session '%s'\n", *batchSession)

		// Create or get session
		var sessionID int64
		err = store.DB.QueryRow("SELECT id FROM sessions WHERE name = ?", *batchSession).Scan(&sessionID)
		if err != nil {
			sessionID, err = store.CreateSession(*batchSession, *batchTarget)
			if err != nil {
				log.Fatalf("Failed to create session: %v", err)
			}
		}

		// 1. Run Individual Tool
		if *batchTool != "" {
			tools, _ := store.GetTools()
			var tool db.Tool
			var found bool
			for _, t := range tools {
				if t.DefaultBinaryName == *batchTool || t.Name == *batchTool {
					tool = t
					found = true
					break
				}
			}
			if !found {
				log.Fatalf("Tool not found: %s", *batchTool)
			}

			if len(tool.Profiles) == 0 {
				log.Fatalf("No attack profiles found for tool %s", tool.Name)
			}
			profile := tool.Profiles[0]

			fmt.Printf("[*] Executing %s (%s) on %s\n", tool.Name, profile.Name, *batchTarget)

			var outputBuffer bytes.Buffer
			multi := io.MultiWriter(os.Stdout, &outputBuffer)

			err = engine.Execute(context.Background(), tool.DefaultBinaryName, profile.Args, *batchTarget, make(map[string]string), multi, multi)
			if err != nil {
				log.Printf("[!] Execution finished with error: %v\n", err)
			} else {
				log.Println("[+] Execution completed successfully.")
			}

			discoveries := parser.ExtractEntities(tool.DefaultBinaryName, 0, sessionID, outputBuffer.String())
			fmt.Printf("\n--- Batch Mode Complete ---\n")
			fmt.Printf("Discoveries parsed: %d\n", len(discoveries))
			for _, d := range discoveries {
				fmt.Printf("- [%s] %s\n", d.Type, d.Value)
			}
		}

		// 2. Run Scenario
		if *batchScenario != "" {
			scenarios, _ := store.GetScenarios()
			var scenario *db.Scenario
			for _, s := range scenarios {
				if strings.Contains(strings.ToLower(s.Name), strings.ToLower(*batchScenario)) {
					scenario = &s
					break
				}
			}
			if scenario == nil {
				log.Fatalf("Scenario not found matching: %s", *batchScenario)
			}

			fmt.Printf("[*] Executing Scenario Chain: %s\n", scenario.Name)
			done := orchestrator.RunScenario(sessionID, scenario.ID, *batchTarget)
			
			// Wait for completion
			<-done
			
			fmt.Printf("\n--- Scenario chain engaged. Monitor console for multi-step execution ---\n")
		}

		os.Exit(0)
	}

	// 5. Start WebSocket Hub
	go hub.Run()

	// 6. Initialize API Handler
	handler := api.NewHandler(store, engine, orchestrator, evidence, hub, aiClient, filepath.Join(baseDir, "uploads"))

	// 6. Setup Router
	router := api.NewRouter(handler)

	// 7. Start Frontend Server (Port 8080 - avoid sudo)
	frontendPath := filepath.Join(baseDir, "c2-frontend", "out")
	go func() {
		addr := ":8080"
		log.Printf("Frontend Server starting on http://localhost%s", addr)
		fs := http.FileServer(http.Dir(frontendPath))
		if err := http.ListenAndServe(addr, fs); err != nil {
			log.Printf("Frontend Server failed: %v", err)
		}
	}()

	// 8. Start API Server (Port 1453)
	apiAddr := ":1453"
	log.Printf("API Server starting on http://localhost%s", apiAddr)
	
	apiServer := &http.Server{
		Addr:    apiAddr,
		Handler: router,
	}

	if err := apiServer.ListenAndServe(); err != nil {
		log.Fatalf("API Server failed: %v", err)
	}
}
