package api

import (
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"net/http"
)

func NewRouter(h *Handler) http.Handler {
	r := mux.NewRouter()

	// REST API
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/status", h.GetStatus).Methods("GET")
	api.HandleFunc("/sessions", h.ListSessions).Methods("GET")
	api.HandleFunc("/sessions", h.CreateSession).Methods("POST")
	api.HandleFunc("/sessions", h.DeleteSession).Methods("DELETE")
	api.HandleFunc("/automation/rules", h.ListAutomationRules).Methods("GET")
	api.HandleFunc("/automation/rules", h.CreateAutomationRule).Methods("POST")
	api.HandleFunc("/automation/rules", h.UpdateAutomationRule).Methods("PUT")
	api.HandleFunc("/automation/rules", h.DeleteAutomationRule).Methods("DELETE")
	api.HandleFunc("/ai/models", h.GetOllamaModels).Methods("GET")
	api.HandleFunc("/ai/next-steps", h.SuggestNextSteps).Methods("GET")
	api.HandleFunc("/scenarios", h.ListScenarios).Methods("GET")
	api.HandleFunc("/scenarios/run", h.RunScenario).Methods("POST")
	api.HandleFunc("/timeline", h.GetTimeline).Methods("GET")
	api.HandleFunc("/timeline", h.ClearTimeline).Methods("DELETE")
	api.HandleFunc("/assets/search", h.GlobalSearch).Methods("GET")
	api.HandleFunc("/assets/all", h.GetAllAssets).Methods("GET")
	api.HandleFunc("/tools", h.GetTools).Methods("GET")
	api.HandleFunc("/notes", h.GetNote).Methods("GET")
	api.HandleFunc("/notes", h.SaveNote).Methods("POST")
	api.HandleFunc("/ai-config", h.SaveAIKey).Methods("POST")
	api.HandleFunc("/ai-config", h.GetAIConfigs).Methods("GET")
	api.HandleFunc("/ai/detect-provider", h.DetectProvider).Methods("POST")
	api.HandleFunc("/ai/chat", h.Chat).Methods("POST")
	api.HandleFunc("/history", h.GetScanHistory).Methods("GET")
	api.HandleFunc("/evidence", h.ListEvidence).Methods("GET")
	api.HandleFunc("/files", h.GetFilesTree).Methods("GET")
	api.HandleFunc("/files/tree", h.GetFilesTree).Methods("GET")
	api.HandleFunc("/files/content", h.GetFileContent).Methods("GET")
	api.HandleFunc("/files/create", h.CreateFile).Methods("POST")
	api.HandleFunc("/files/edit", h.EditFile).Methods("PUT")
	api.HandleFunc("/files/delete", h.DeleteFile).Methods("DELETE")
	api.HandleFunc("/uploads", h.ListUploads).Methods("GET")
	api.HandleFunc("/uploads", h.UploadFile).Methods("POST")
	api.HandleFunc("/uploads", h.DeleteUpload).Methods("DELETE")
	api.HandleFunc("/discoveries", h.GetDiscoveries).Methods("GET")
	api.HandleFunc("/automation", h.GetAutomationStatus).Methods("GET")
	api.HandleFunc("/automation/toggle", h.ToggleAutomation).Methods("POST")
	api.HandleFunc("/report", h.GenerateReport).Methods("GET")
	api.HandleFunc("/run", h.RunTool).Methods("POST")
	api.HandleFunc("/kill", h.KillTool).Methods("POST")

	// WebSocket
	r.Handle("/ws", h.Hub)
	r.HandleFunc("/shell", h.HandleShell)

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	return c.Handler(r)
}
