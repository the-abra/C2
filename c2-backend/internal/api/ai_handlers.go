package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
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

	// 2. Resolve API Key & Provider
	apiKey := req.APIKey
	if apiKey == "" {
		// Fallback to DB (Not implemented yet in store, let's assume we can fetch it)
		// For now, we expect it from the UI or stored in a persistent way
	}

	var proxyResp string
	var err error

	if strings.Contains(req.Model, "gpt") {
		proxyResp, err = h.proxyOpenAI(req.Model, prompt.String(), apiKey)
	} else if strings.Contains(req.Model, "gemini") {
		proxyResp, err = h.proxyGemini(req.Model, prompt.String(), apiKey)
	} else if strings.Contains(req.Model, "claude") {
		proxyResp, err = h.proxyAnthropic(req.Model, prompt.String(), apiKey)
	} else {
		proxyResp = fmt.Sprintf("[Mock %s] No provider implementation found.", req.Model)
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

func (h *Handler) proxyOpenAI(model, prompt, key string) (string, error) {
	if key == "" { return "OpenAI API Key missing.", nil }
	payload := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{{"role": "user", "content": prompt}},
	}
	body, _ := json.Marshal(payload)
	httpReq, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(body))
	httpReq.Header.Set("Authorization", "Bearer "+key)
	httpReq.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil { return "", err }
	defer resp.Body.Close()
	
	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	if choices, ok := res["choices"].([]interface{}); ok && len(choices) > 0 {
		if msg, ok := choices[0].(map[string]interface{})["message"].(map[string]interface{}); ok {
			return msg["content"].(string), nil
		}
	}
	return "Invalid response from OpenAI", nil
}

func (h *Handler) proxyGemini(model, prompt, key string) (string, error) {
	if key == "" { return "Gemini API Key missing.", nil }
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent?key=%s", model, key)
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{{"parts": []map[string]string{{"text": prompt}}}},
	}
	body, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
	if err != nil { return "", err }
	defer resp.Body.Close()
	
	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	if c, ok := res["candidates"].([]interface{}); ok && len(c) > 0 {
		if parts, ok := c[0].(map[string]interface{})["content"].(map[string]interface{})["parts"].([]interface{}); ok && len(parts) > 0 {
			return parts[0].(map[string]interface{})["text"].(string), nil
		}
	}
	return "Invalid response from Gemini", nil
}

func (h *Handler) proxyAnthropic(model, prompt, key string) (string, error) {
	if key == "" { return "Anthropic API Key missing.", nil }
	payload := map[string]interface{}{
		"model": model,
		"max_tokens": 4096,
		"messages": []map[string]string{{"role": "user", "content": prompt}},
	}
	body, _ := json.Marshal(payload)
	httpReq, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewBuffer(body))
	httpReq.Header.Set("x-api-key", key)
	httpReq.Header.Set("anthropic-version", "2023-06-01")
	httpReq.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil { return "", err }
	defer resp.Body.Close()
	
	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	if content, ok := res["content"].([]interface{}); ok && len(content) > 0 {
		if text, ok := content[0].(map[string]interface{})["text"].(string); ok {
			return text, nil
		}
	}
	return "Invalid response from Anthropic", nil
}
