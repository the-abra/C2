package core

import (
	"c2-backend/internal/ai"
	"c2-backend/internal/db"
	"c2-backend/internal/ws"
	"fmt"
	"log"
	"strings"
)

type Advisor struct {
	client *ai.AIClient
}

func NewAdvisor(client *ai.AIClient) *Advisor {
	return &Advisor{client: client}
}

// AnalyzeLog sends tool output to AI and broadcasts advice if something critical is found.
func (a *Advisor) AnalyzeLog(sessionID int64, toolName, target, logOutput string, store *db.Store, hub *ws.Hub) {
	// 1. Fetch AI Config
	configs, err := store.GetAIConfigs()
	if err != nil || len(configs) == 0 {
		return // No AI configured
	}

	// Use first available provider
	var provider, model, key string
	for p, cfg := range configs {
		provider = p
		model = cfg["model"]
		key = cfg["key"]
		break
	}

	if key == "" || model == "" {
		return
	}

	log.Printf("[*] AI Advisor: Analyzing output from %s on %s using %s...", toolName, target, provider)

	// 2. Construct Prompt
	prompt := fmt.Sprintf(`You are the Duelist C2 Tactical Advisor. 
Analyze the following tool output from '%s' on target '%s'.
Your goal is to identify critical vulnerabilities, misconfigurations, or clear exploitation paths.

CRITICAL INSTRUCTIONS:
- If you find something high-value, provide a concise, 2-3 sentence recommendation.
- If you see a specific vulnerability, suggest the next tool or command to run.
- IF THE OUTPUT IS NOISY OR CONTAINS NOTHING CRITICAL, REPLY EXACTLY WITH THE WORD 'NONE'.
- Do not provide conversational filler.

TOOL OUTPUT:
%s`, toolName, target, logOutput)

	// 3. Call AI
	advice, err := a.client.ProxyCall(model, prompt, key)
	if err != nil {
		log.Printf("[!] AI Advisor error: %v", err)
		return
	}

	// 4. Broadcast if actionable
	advice = strings.TrimSpace(advice)
	if strings.ToUpper(advice) != "NONE" && len(advice) > 5 {
		log.Printf("[+] AI Advisor: Actionable intelligence found for %s", target)
		hub.BroadcastAIAdvice(sessionID, toolName, target, advice)
	}
}
