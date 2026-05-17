package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

type AIClient struct {
	OllamaURL string
}

func NewClient() *AIClient {
	return &AIClient{
		OllamaURL: "http://localhost:11434",
	}
}

// ProxyCall now defaults to Ollama
func (c *AIClient) ProxyCall(model, prompt, _ string) (string, error) {
	return c.ProxyOllama(model, prompt)
}

func (c *AIClient) ProxyOllama(model, prompt string) (string, error) {
	payload := map[string]interface{}{
		"model":  model,
		"prompt": prompt,
		"stream": false,
	}
	body, _ := json.Marshal(payload)
	
	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Post(c.OllamaURL+"/api/generate", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return "", fmt.Errorf("ollama connection error: %v (is it running?)", err)
	}
	defer resp.Body.Close()

	var res struct {
		Response string `json:"response"`
		Error    string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	if res.Error != "" {
		return "", fmt.Errorf("ollama error: %s", res.Error)
	}
	return res.Response, nil
}

// ListModels returns a list of models installed on the local Ollama instance
func (c *AIClient) ListModels() ([]string, error) {
	// Try API first
	resp, err := http.Get(c.OllamaURL + "/api/tags")
	if err == nil {
		defer resp.Body.Close()
		var res struct {
			Models []struct {
				Name string `json:"name"`
			} `json:"models"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&res); err == nil {
			names := make([]string, len(res.Models))
			for i, m := range res.Models {
				names[i] = m.Name
			}
			return names, nil
		}
	}

	// Fallback to shell command
	cmd := exec.Command("ollama", "list")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list ollama models: %v", err)
	}

	lines := strings.Split(string(output), "\n")
	var models []string
	// Skip header line
	for i := 1; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) > 0 {
			models = append(models, fields[0])
		}
	}
	return models, nil
}
