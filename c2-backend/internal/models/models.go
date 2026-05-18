package models

import (
	"time"
)

type Session struct {
	ID             uint      `json:"id"`
	Name           string    `json:"name"`
	Target         string    `json:"target"`
	CreatedAt      time.Time `json:"created_at"`
	LastAccessedAt time.Time `json:"last_accessed_at"`
}

type Tool struct {
	ID                uint            `json:"id"`
	Name              string          `json:"name"`
	Category          string          `json:"category"`
	Description       string          `json:"description"`
	DefaultBinaryName string          `json:"default_binary_name"`
	IsInstalled       bool            `json:"is_installed"`
	Profiles          []AttackProfile `json:"profiles"`
	Parsers           []Parser        `json:"-"`
}

type AttackProfile struct {
	ID        uint     `json:"id"`
	ToolID    uint     `json:"tool_id"`
	Name      string   `json:"name"`
	Args      []string `json:"args"`
	Rationale string   `json:"rationale"`
}

type Parser struct {
	ID     uint   `json:"id"`
	ToolID uint   `json:"tool_id"`
	Type   string `json:"type"` 
	Regex  string `json:"regex"`
}

type Discovery struct {
	ID           uint      `json:"id"`
	SessionID    uint      `json:"session_id"`
	Type         string    `json:"type"` 
	Value        string    `json:"value"`
	Metadata     string    `json:"metadata"`
	SourceScanID uint      `json:"source_scan_id"`
	CreatedAt    time.Time `json:"created_at"`
}

type Scenario struct {
	ID          uint           `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Category    string         `json:"category"`
	Steps       []ScenarioStep `json:"steps"`
}

type ScenarioStep struct {
	ID                   uint   `json:"id"`
	ScenarioID           uint   `json:"scenario_id"`
	OrderIndex           int    `json:"order_index"`
	ToolID               uint   `json:"tool_id"`
	ToolName             string `json:"tool_name"`
	ProfileID            uint   `json:"profile_id"`
	ProfileName          string `json:"profile_name"`
	WaitForPrevious      bool   `json:"wait_for_previous"`
	AutoPropagateTargets bool   `json:"auto_propagate_targets"`
}

type History struct {
	ID        uint      `json:"id"`
	SessionID uint      `json:"session_id"`
	ToolID    uint      `json:"tool_id"`
	ToolName  string    `json:"tool_name"`
	ProfileID uint      `json:"profile_id"`
	Target    string    `json:"target"`
	Status    string    `json:"status"` 
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

type Note struct {
	ID        uint      `json:"id"`
	SessionID uint      `json:"session_id"`
	Target    string    `json:"target"`
	Content   string    `json:"content"`
	UpdatedAt time.Time `json:"updated_at"`
}
