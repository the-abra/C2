package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
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
		models = []string{"claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"}
	} else if strings.HasPrefix(req.APIKey, "AIza") {
		provider = "Google"
		models = []string{"gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"}
	} else if strings.HasPrefix(req.APIKey, "sk-") {
		provider = "OpenAI"
		models = []string{"gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini", "gpt-4-turbo"}
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

	// Proxy logic to the actual AI Provider based on model prefix
	var proxyResp string
	
	if strings.HasPrefix(req.Model, "gpt") && req.APIKey != "" {
		payload := map[string]interface{}{
			"model": req.Model,
			"messages": []map[string]string{
				{"role": "user", "content": prompt.String()},
			},
		}
		body, _ := json.Marshal(payload)
		httpReq, _ := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(body))
		httpReq.Header.Set("Authorization", "Bearer "+req.APIKey)
		httpReq.Header.Set("Content-Type", "application/json")
		
		client := &http.Client{}
		resp, err := client.Do(httpReq)
		if err == nil {
			defer resp.Body.Close()
			var res map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&res)
			if choices, ok := res["choices"].([]interface{}); ok && len(choices) > 0 {
				if msg, ok := choices[0].(map[string]interface{})["message"].(map[string]interface{}); ok {
					proxyResp = msg["content"].(string)
				}
			} else {
				proxyResp = "Error from OpenAI API."
			}
		} else {
			proxyResp = "Failed to connect to OpenAI API."
		}
	} else if strings.HasPrefix(req.Model, "gemini") && req.APIKey != "" {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", req.Model, req.APIKey)
		payload := map[string]interface{}{
			"contents": []map[string]interface{}{
				{"parts": []map[string]string{{"text": prompt.String()}}},
			},
		}
		body, _ := json.Marshal(payload)
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(body))
		if err == nil {
			defer resp.Body.Close()
			bodyBytes, _ := io.ReadAll(resp.Body)
			var res map[string]interface{}
			json.Unmarshal(bodyBytes, &res)
			if c, ok := res["candidates"].([]interface{}); ok && len(c) > 0 {
				if parts, ok := c[0].(map[string]interface{})["content"].(map[string]interface{})["parts"].([]interface{}); ok && len(parts) > 0 {
					proxyResp = parts[0].(map[string]interface{})["text"].(string)
				}
			} else {
				proxyResp = "Error from Gemini API."
			}
		} else {
			proxyResp = "Failed to connect to Gemini API."
		}
	} else {
		// Mock response if no API key or unsupported model
		proxyResp = fmt.Sprintf("[Mock %s] Received persona and %d context files. Your message: %s", req.Model, len(req.SelectedFiles), req.Message)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      "msg-auto",
		"role":    "assistant",
		"content": proxyResp,
		"model":   req.Model,
		"timestamp": "", // let frontend handle timestamp
	})
}
