package api

import (
	"c2-backend/internal/core"
	"c2-backend/internal/db"
	"c2-backend/internal/ws"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

type Handler struct {
	Store    *db.Store
	Engine   *core.Engine
	Evidence *core.EvidenceManager
	Hub      *ws.Hub
	scans    map[int64]context.CancelFunc
	scansMu  sync.Mutex
}

func NewHandler(s *db.Store, e *core.Engine, ev *core.EvidenceManager, h *ws.Hub) *Handler {
	return &Handler{
		Store:    s,
		Engine:   e,
		Evidence: ev,
		Hub:      h,
		scans:    make(map[int64]context.CancelFunc),
	}
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "version": "1.0.0"})
}

type ToolResponse struct {
	db.Tool
	IsInstalled bool `json:"is_installed"`
}

func (h *Handler) GetTools(w http.ResponseWriter, r *http.Request) {
	tools, err := h.Store.GetTools()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var res []ToolResponse
	seen := make(map[string]bool)

	for _, t := range tools {
		lowerName := strings.ToLower(t.Name)
		if seen[lowerName] {
			continue
		}
		seen[lowerName] = true

		binaryName := strings.ToLower(t.DefaultBinaryName)
		_, err := exec.LookPath(binaryName)
		isInstalled := err == nil

		// Fallback check for common paths if not in $PATH
		if !isInstalled {
			fallbacks := []string{
				"/usr/bin/vendor_perl/" + binaryName,
				"/usr/local/bin/" + binaryName,
				"/usr/bin/" + binaryName,
			}
			for _, p := range fallbacks {
				if _, err := os.Stat(p); err == nil {
					isInstalled = true
					break
				}
			}
		}

		res = append(res, ToolResponse{
			Tool:        t,
			IsInstalled: isInstalled,
		})
	}
	json.NewEncoder(w).Encode(res)
}

func (h *Handler) RunTool(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ToolID    int    `json:"tool_id"`
		ProfileID int    `json:"profile_id"`
		Target    string `json:"target"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	profile, err := h.Store.GetAttackProfileByID(req.ProfileID)
	if err != nil {
		http.Error(w, "Profile not found", http.StatusNotFound)
		return
	}

	tools, _ := h.Store.GetTools()
	var binary string
	for _, t := range tools {
		if t.ID == profile.ToolID {
			binary = t.DefaultBinaryName
			break
		}
	}

	file, path, err := h.Evidence.CreateEvidenceFile(req.Target, binary)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	scanID, err := h.Store.CreateScanEntry(req.ToolID, req.Target, path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	h.scansMu.Lock()
	h.scans[scanID] = cancel
	h.scansMu.Unlock()

	// Resolve target path if it's an uploaded file
	resolvedTarget := req.Target
	uploadPath := filepath.Join("data", "uploads", req.Target)
	if _, err := os.Stat(uploadPath); err == nil {
		absPath, _ := filepath.Abs(uploadPath)
		resolvedTarget = absPath
	}

	go func() {
		defer file.Close()
		defer cancel()

		wsWriter := &ws.WSWriter{Hub: h.Hub, ToolName: binary}
		multi := io.MultiWriter(file, wsWriter)
		err := h.Engine.Execute(ctx, binary, profile.Args, resolvedTarget, multi, multi)
		wsWriter.Close()

		status := "completed"
		if err != nil {
			status = "failed"
			if ctx.Err() == context.Canceled {
				status = "killed"
			}
		}
		h.Store.UpdateScanStatus(scanID, status)
		h.Hub.BroadcastStatus(binary, status)

		h.scansMu.Lock()
		delete(h.scans, scanID)
		h.scansMu.Unlock()
	}()

	json.NewEncoder(w).Encode(map[string]interface{}{"scan_id": scanID, "status": "started"})
}

func (h *Handler) GetNote(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	content, err := h.Store.GetNote(target)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"content": content})
}

func (h *Handler) SaveNote(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Target  string `json:"target"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	h.Store.SaveNote(req.Target, req.Content)
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) GetAIConfigs(w http.ResponseWriter, r *http.Request) {
	configs, err := h.Store.GetAIConfigs()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configs)
}

func (h *Handler) SaveAIKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Provider  string `json:"provider"`
		ModelName string `json:"model_name"`
		APIKey    string `json:"api_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	h.Store.SaveAIKey(req.Provider, req.ModelName, req.APIKey)
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) ListEvidence(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	files, _ := h.Evidence.ListEvidenceFiles(target)
	json.NewEncoder(w).Encode(files)
}

func (h *Handler) KillTool(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ScanID int64 `json:"scan_id"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	h.scansMu.Lock()
	if cancel, ok := h.scans[req.ScanID]; ok {
		cancel()
		delete(h.scans, req.ScanID)
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "Not found", http.StatusNotFound)
	}
	h.scansMu.Unlock()
}

func (h *Handler) HandleShell(w http.ResponseWriter, r *http.Request) {
	h.Hub.HandleShell(w, r)
}
