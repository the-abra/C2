package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func (h *Handler) DetectProvider(w http.ResponseWriter, r *http.Request) {
	var req struct {
		APIKey string `json:"api_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var provider string
	var models []string

	if strings.HasPrefix(req.APIKey, "sk-ant") || strings.HasPrefix(req.APIKey, "ant-") {
		provider = "Anthropic"
		models = []string{"claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-haiku-20240307"}
	} else if strings.HasPrefix(req.APIKey, "AIza") || len(req.APIKey) > 30 {
		provider = "Google"
		models = []string{"gemini-1.5-pro", "gemini-1.5-flash"}
	} else if strings.HasPrefix(req.APIKey, "sk-") || strings.HasPrefix(req.APIKey, "org-") {
		provider = "OpenAI"
		models = []string{"gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"}
	} else {
		provider = "Unknown"
		models = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"provider": provider,
		"models":   models,
	})
}

func (h *Handler) Chat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Model         string `json:"model"`
		Message       string `json:"message"`
		Persona       string `json:"persona"`
		APIKey        string `json:"api_key"`
		SelectedFiles []struct {
			Target   string `json:"target"`
			Filename string `json:"filename"`
		} `json:"selected_files"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 1. Build Prompt with Context
	var prompt strings.Builder
	prompt.WriteString("System Persona:\n" + req.Persona + "\n\n")

	for _, sf := range req.SelectedFiles {
		safeTarget := filepath.Clean(sf.Target)
		safeFile := filepath.Clean(sf.Filename)
		
		if safeTarget == "." || safeTarget == ".." || safeFile == "." || safeFile == ".." || filepath.IsAbs(safeTarget) || filepath.IsAbs(safeFile) || strings.Contains(safeTarget, string(filepath.Separator)) || strings.Contains(safeFile, string(filepath.Separator)) {
			prompt.WriteString(fmt.Sprintf("--- Context from Evidence: %s/%s ---\n[Error: Invalid path detected]\n\n", sf.Target, sf.Filename))
			continue
		}

		filePath := filepath.Join(h.Evidence.BaseDir, "targets", safeTarget, safeFile)
		content, err := os.ReadFile(filePath)
		if err == nil {
			prompt.WriteString(fmt.Sprintf("--- Context from Evidence: %s/%s ---\n", safeTarget, safeFile))
			prompt.Write(content)
			prompt.WriteString("\n\n")
		} else {
			prompt.WriteString(fmt.Sprintf("--- Context from Evidence: %s/%s ---\n[Error reading file: %v]\n\n", safeTarget, safeFile, err))
		}
	}

	prompt.WriteString("User Message: " + req.Message)

	// 2. Resolve API Key
	apiKey := req.APIKey
	if apiKey == "" {
		configs, _ := h.Store.GetAIConfigs()
		for provider, cfg := range configs {
			if (provider == "OpenAI" && strings.Contains(req.Model, "gpt")) ||
			   (provider == "Google" && strings.Contains(req.Model, "gemini")) ||
			   (provider == "Anthropic" && strings.Contains(req.Model, "claude")) {
				apiKey = cfg["key"]
				break
			}
		}
	}

	// 3. Call AI Client
	// Note: We are prioritizing Ollama as per user instruction
	var proxyResp string
	var err error
	if strings.HasPrefix(req.Model, "ollama/") || !strings.Contains(req.Model, "gpt") && !strings.Contains(req.Model, "gemini") && !strings.Contains(req.Model, "claude") {
		modelName := strings.TrimPrefix(req.Model, "ollama/")
		proxyResp, err = h.AI.ProxyOllama(modelName, prompt.String())
	} else {
		proxyResp, err = h.AI.ProxyCall(req.Model, prompt.String(), apiKey)
	}

	if err != nil {
		proxyResp = fmt.Sprintf("Error: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":        "msg-" + strings.ToLower(req.Model),
		"role":      "assistant",
		"content":   proxyResp,
		"model":     req.Model,
		"timestamp": "",
	})
}

func (h *Handler) SuggestNextSteps(w http.ResponseWriter, r *http.Request) {
	sessionID, _ := strconv.ParseInt(r.URL.Query().Get("session_id"), 10, 64)
	model := r.URL.Query().Get("model")
	if model == "" {
		// Try to find a local model
		models, _ := h.AI.ListModels()
		if len(models) > 0 {
			model = models[0]
		} else {
			model = "llama3"
		}
	}

	// 1. Gather Context
	discoveries, _ := h.Store.GetDiscoveries(sessionID)
	history, _ := h.Store.GetScanHistory(sessionID)
	
	var ctx strings.Builder
	ctx.WriteString("Current Discoveries:\n")
	for i, d := range discoveries {
		if i > 10 { break }
		ctx.WriteString(fmt.Sprintf("- %s: %s\n", d.Type, d.Value))
	}
	ctx.WriteString("\nRecent History:\n")
	for i, sh := range history {
		if i > 5 { break }
		ctx.WriteString(fmt.Sprintf("- %s on %s: %s\n", sh.ToolName, sh.Target, sh.Status))
	}

	// 2. Construct Prompt
	prompt := fmt.Sprintf(`You are the Duelist C2 Tactical AI. 
Based on the mission context below, suggest 2-3 specific next tactical steps (commands or tool executions).
The operator is using tools like: nmap, subfinder, nuclei, httpx, ffuf, gobuster, sqlmap.

MISSION CONTEXT:
%s

OUTPUT FORMAT:
Return ONLY a valid JSON array of strings, e.g. ["nmap -sV 10.0.0.1", "nuclei -u http://example.com"].
Do not include any explanation or filler. No markdown blocks, just the raw JSON.`, ctx.String())

	// 3. Call AI
	resp, err := h.AI.ProxyOllama(model, prompt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 4. Parse & Sanitize AI Response (Try to extract JSON array)
	start := strings.Index(resp, "[")
	end := strings.LastIndex(resp, "]")
	if start == -1 || end == -1 {
		json.NewEncoder(w).Encode([]string{})
		return
	}
	cleanJSON := resp[start : end+1]
	
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(cleanJSON))
}
