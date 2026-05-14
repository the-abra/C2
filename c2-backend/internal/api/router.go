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
	api.HandleFunc("/tools", h.GetTools).Methods("GET")
	api.HandleFunc("/notes", h.GetNote).Methods("GET")
	api.HandleFunc("/notes", h.SaveNote).Methods("POST")
	api.HandleFunc("/ai-config", h.SaveAIKey).Methods("POST")
	api.HandleFunc("/ai/detect-provider", h.DetectProvider).Methods("POST")
	api.HandleFunc("/ai/chat", h.Chat).Methods("POST")
	api.HandleFunc("/evidence", h.ListEvidence).Methods("GET")
	api.HandleFunc("/files", h.GetFilesTree).Methods("GET")
	api.HandleFunc("/files/content", h.GetFileContent).Methods("GET")
	api.HandleFunc("/files/create", h.CreateFile).Methods("POST")
	api.HandleFunc("/files/edit", h.EditFile).Methods("PUT")
	api.HandleFunc("/files/delete", h.DeleteFile).Methods("DELETE")
	api.HandleFunc("/uploads", h.ListUploads).Methods("GET")
	api.HandleFunc("/uploads", h.UploadFile).Methods("POST")
	api.HandleFunc("/uploads", h.DeleteUpload).Methods("DELETE")
	api.HandleFunc("/run", h.RunTool).Methods("POST")
	api.HandleFunc("/kill", h.KillTool).Methods("POST")

	// WebSocket
	r.Handle("/ws", h.Hub)
	r.HandleFunc("/shell", h.HandleShell)

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost", "http://127.0.0.1"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type"},
	})

	return c.Handler(r)
}
