package core

import (
	"c2-backend/internal/db"
	"c2-backend/internal/ws"
	"fmt"
	"log"
	"strings"
	"sync"
)

type ChainRule struct {
	DiscoveryType string // domain, ip, service
	ToolName      string // httpx, nuclei, nmap
	ProfileName   string // e.g., "Default Scan" or "Aggressive"
}

type Chainer struct {
	IsEnabled bool
	mu        sync.RWMutex
	store     *db.Store
	evidence  *EvidenceManager
	hub       *ws.Hub
	rules     []ChainRule
	submitFn  func(job *Job)
}

func NewChainer(s *db.Store, ev *EvidenceManager, h *ws.Hub, submitFn func(job *Job)) *Chainer {
	return &Chainer{
		IsEnabled: false,
		store:     s,
		evidence:  ev,
		hub:       h,
		submitFn:  submitFn,
		rules: []ChainRule{
			{DiscoveryType: "domain", ToolName: "httpx", ProfileName: "Title & Status"},
			{DiscoveryType: "ip", ToolName: "nmap", ProfileName: "Fast Scan (Top 100)"},
			{DiscoveryType: "service", ToolName: "nuclei", ProfileName: "Technological Profile"},
		},
	}
}

func (c *Chainer) SetEnabled(enabled bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.IsEnabled = enabled
	log.Printf("[*] Automation Auto-Pilot set to: %v", enabled)
}

func (c *Chainer) Evaluate(discoveries []db.Discovery) {
	c.mu.RLock()
	enabled := c.IsEnabled
	c.mu.RUnlock()

	if !enabled {
		return
	}

	rules, err := c.store.GetAutomationRules()
	if err != nil {
		log.Printf("[!] Auto-Pilot: Failed to fetch rules: %v", err)
		return
	}

	for _, d := range discoveries {
		for _, rule := range rules {
			if !rule.IsEnabled {
				continue
			}
			if d.Type == rule.TriggerType {
				// Pattern matching (simplified, could use regex)
				if rule.TriggerPattern == "" || strings.Contains(strings.ToLower(d.Value), strings.ToLower(rule.TriggerPattern)) {
					go c.trigger(rule, d)
				}
			}
		}
	}
}

func (c *Chainer) trigger(rule db.AutomationRule, d db.Discovery) {
	// Loop Protection: Don't trigger the same tool that found the discovery
	var sourceTool string
	c.store.DB.QueryRow(`
		SELECT t.default_binary_name 
		FROM scan_history sh 
		JOIN tools t ON sh.tool_id = t.id 
		WHERE sh.id = ?`, d.SourceScanID).Scan(&sourceTool)

	// Fetch target tool binary
	var targetBinary string
	c.store.DB.QueryRow("SELECT default_binary_name FROM tools WHERE id = ?", rule.ToolID).Scan(&targetBinary)

	if strings.EqualFold(sourceTool, targetBinary) {
		log.Printf("[!] Auto-Pilot: Loop detected for %s, skipping trigger.", targetBinary)
		return
	}

	log.Printf("[+] Auto-Pilot: Triggering rule '%s' (%s) for discovery %s", rule.Name, targetBinary, d.Value)

	// Resolve Profile
	profiles, _ := c.store.GetAttackProfiles(rule.ToolID)
	var args []string
	for _, p := range profiles {
		if p.ID == rule.ProfileID {
			args = p.Args
			break
		}
	}

	if len(args) == 0 && len(profiles) > 0 {
		args = profiles[0].Args
	}

	if len(args) == 0 {
		log.Printf("[!] Auto-Pilot: No profile args found for tool %d", rule.ToolID)
		return
	}

	// 2. Setup Evidence File
	file, path, err := c.evidence.CreateEvidenceFile(d.Value, targetBinary)
	if err != nil {
		log.Printf("[!] Auto-Pilot: Evidence setup failed: %v", err)
		return
	}

	// 3. Create Scan Entry
	scanID, err := c.store.CreateScanEntry(d.SessionID, rule.ToolID, d.Value, path)
	if err != nil {
		log.Printf("[!] Auto-Pilot: Scan entry failed: %v", err)
		return
	}

	// 4. Submit Job
	c.submitFn(&Job{
		ID:        scanID,
		SessionID: d.SessionID,
		Binary:    targetBinary,
		Args:      args,
		Target:    d.Value,
		LogFile:   file,
		Hub:       c.hub,
		Store:     c.store,
	})

	// Log to timeline
	c.store.AddTimelineEvent(db.TimelineEvent{
		SessionID:   d.SessionID,
		Type:        "auto_pilot",
		Title:       "Auto-Pilot Engaged",
		Description: fmt.Sprintf("Triggered %s on %s via rule '%s'", targetBinary, d.Value, rule.Name),
	})
}
