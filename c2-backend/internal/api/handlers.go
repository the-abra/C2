package api

import (
	"c2-backend/internal/ai"
	"c2-backend/internal/core"
	"c2-backend/internal/db"
	"c2-backend/internal/ws"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

type Handler struct {
	Store        *db.Store
	Engine       *core.Engine
	Orchestrator *core.JobOrchestrator
	Evidence     *core.EvidenceManager
	Hub          *ws.Hub
	AI           *ai.AIClient
	UploadDir    string
}

func NewHandler(s *db.Store, e *core.Engine, orch *core.JobOrchestrator, ev *core.EvidenceManager, h *ws.Hub, a *ai.AIClient, uploadDir string) *Handler {
	return &Handler{
		Store:        s,
		Engine:       e,
		Orchestrator: orch,
		Evidence:     ev,
		Hub:          h,
		AI:           a,
		UploadDir:    uploadDir,
	}
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "version": "1.0.0"})
}

func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.Store.GetSessions()
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(sessions)
}

func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name   string `json:"name"`
		Target string `json:"target"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.Store.CreateSession(req.Name, req.Target)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]int64{"id": id})
}

func (h *Handler) DeleteSession(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	if err := h.Store.DeleteSession(id); err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) ListAutomationRules(w http.ResponseWriter, r *http.Request) {
	rules, err := h.Store.GetAutomationRules()
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(rules)
}

func (h *Handler) CreateAutomationRule(w http.ResponseWriter, r *http.Request) {
	var req db.AutomationRule
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id, err := h.Store.CreateAutomationRule(req)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]int64{"id": id})
}

func (h *Handler) UpdateAutomationRule(w http.ResponseWriter, r *http.Request) {
	var req db.AutomationRule
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.Store.UpdateAutomationRule(req); err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) DeleteAutomationRule(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, _ := strconv.ParseInt(idStr, 10, 64)
	if err := h.Store.DeleteAutomationRule(id); err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) GetOllamaModels(w http.ResponseWriter, r *http.Request) {
	models, err := h.AI.ListModels()
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(models)
}

func (h *Handler) GetTimeline(w http.ResponseWriter, r *http.Request) {
	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	events, err := h.Store.GetTimeline(sessionID)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(events)
}

func (h *Handler) ClearTimeline(w http.ResponseWriter, r *http.Request) {
	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	if err := h.Store.ClearTimeline(sessionID); err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) ListScenarios(w http.ResponseWriter, r *http.Request) {
	scenarios, err := h.Store.GetScenarios()
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(scenarios)
}

func (h *Handler) RunScenario(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID  int64  `json:"session_id"`
		ScenarioID int64  `json:"scenario_id"`
		Target     string `json:"target"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	h.Store.UpdateSessionAccess(req.SessionID)
	
	// Launch scenario in goroutine (it manages its own sequence)
	go h.Orchestrator.RunScenario(req.SessionID, req.ScenarioID, req.Target)

	json.NewEncoder(w).Encode(map[string]string{"status": "scenario_started"})
}

type ToolResponse struct {
	db.Tool
	IsInstalled bool `json:"is_installed"`
}

func (h *Handler) GetTools(w http.ResponseWriter, r *http.Request) {
	tools, err := h.Store.GetTools()
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
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
		SessionID int64             `json:"session_id"`
		ToolID    int               `json:"tool_id"`
		ProfileID int               `json:"profile_id"`
		Target    string            `json:"target"`
		Params    map[string]string `json:"params"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	h.Store.UpdateSessionAccess(req.SessionID)

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
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	scanID, err := h.Store.CreateScanEntry(req.SessionID, req.ToolID, req.Target, path)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.Orchestrator.Submit(&core.Job{
		ID:        scanID,
		SessionID: req.SessionID,
		Binary:    binary,
		Args:      profile.Args,
		Target:    req.Target,
		Params:    req.Params,
		LogFile:   file,
		Hub:       h.Hub,
		Store:     h.Store,
	})

	h.Store.AddTimelineEvent(db.TimelineEvent{
		SessionID:   req.SessionID,
		Type:        "job_started",
		Title:       fmt.Sprintf("Engaged %s", binary),
		Description: fmt.Sprintf("Target: %s | Profile: %s", req.Target, profile.Name),
	})

	json.NewEncoder(w).Encode(map[string]interface{}{"scan_id": scanID, "status": "started"})
}

func (h *Handler) GetNote(w http.ResponseWriter, r *http.Request) {
	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	target := r.URL.Query().Get("target")
	content, err := h.Store.GetNote(sessionID, target)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"content": content})
}

func (h *Handler) SaveNote(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID int64  `json:"session_id"`
		Target    string `json:"target"`
		Content   string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	h.Store.SaveNote(req.SessionID, req.Target, req.Content)
	h.Hub.BroadcastNoteUpdate(req.SessionID, req.Target)

	h.Store.AddTimelineEvent(db.TimelineEvent{
		SessionID:   req.SessionID,
		Type:        "note_saved",
		Title:       "Intelligence Synchronized",
		Description: fmt.Sprintf("Tactical notes updated for %s", req.Target),
	})

	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) GetAIConfigs(w http.ResponseWriter, r *http.Request) {
	configs, err := h.Store.GetAIConfigs()
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
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
	if h.Orchestrator.Kill(req.ScanID) {
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "Not found or already finished", http.StatusNotFound)
	}
}

func (h *Handler) GetDiscoveries(w http.ResponseWriter, r *http.Request) {
	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	discoveries, err := h.Store.GetDiscoveries(sessionID)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(discoveries)
}

func (h *Handler) GetScanHistory(w http.ResponseWriter, r *http.Request) {
	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	history, err := h.Store.GetScanHistory(sessionID)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

func (h *Handler) GetAutomationStatus(w http.ResponseWriter, r *http.Request) {
	status := h.Orchestrator.GetChainer().IsEnabled
	json.NewEncoder(w).Encode(map[string]bool{"is_enabled": status})
}

func (h *Handler) ToggleAutomation(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IsEnabled bool `json:"is_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	h.Orchestrator.GetChainer().SetEnabled(req.IsEnabled)
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	results, err := h.Store.GlobalSearch(q)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(results)
}

func (h *Handler) GetAllAssets(w http.ResponseWriter, r *http.Request) {
	results, err := h.Store.GetAllAssets()
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(results)
}

func (h *Handler) GenerateReport(w http.ResponseWriter, r *http.Request) {
	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	report, err := core.GenerateMarkdownReport(h.Store, sessionID)
	if err != nil {
		log.Printf("[!] API Error in %s: %v", r.URL.Path, err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/markdown")
	w.Write([]byte(report))
}

func (h *Handler) HandleShell(w http.ResponseWriter, r *http.Request) {
	h.Hub.HandleShell(w, r)
}
