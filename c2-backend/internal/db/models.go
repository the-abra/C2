package db

type Tool struct {
	ID                int             `json:"id"`
	Name              string          `json:"name"`
	Category          string          `json:"category"`
	Description       string          `json:"description"`
	DefaultBinaryName string          `json:"default_binary_name"`
	Profiles          []AttackProfile `json:"profiles,omitempty"`
}

type AttackProfile struct {
	ID     int      `json:"id"`
	ToolID int      `json:"tool_id"`
	Name   string   `json:"name"`
	Args   []string `json:"args"` // Stored as JSON in DB, but slice in Go
}

type Session struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	Target         string `json:"target"`
	CreatedAt      string `json:"created_at"`
	LastAccessedAt string `json:"last_accessed_at"`
}

type ScanHistory struct {
	ID          int64  `json:"id"`
	SessionID   int64  `json:"session_id"`
	ToolID      int    `json:"tool_id"`
	Target      string `json:"target"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time,omitempty"`
	Status      string `json:"status"` // running, completed, killed, failed
	LogFilePath string `json:"log_file_path"`
}

type AIKey struct {
	ID        int    `json:"id"`
	Provider  string `json:"provider"`
	ModelName string `json:"model_name"`
	APIKey    string `json:"api_key"`
}

type Discovery struct {
	ID           int64  `json:"id"`
	SessionID    int64  `json:"session_id"`
	Type         string `json:"type"` // domain, ip, service, vuln
	Value        string `json:"value"`
	Metadata     string `json:"metadata"` // JSON string
	SourceScanID int64  `json:"source_scan_id"`
	CreatedAt    string `json:"created_at"`
}

type AutomationRule struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	TriggerType    string `json:"trigger_type"`
	TriggerPattern string `json:"trigger_pattern"`
	ToolID         int    `json:"tool_id"`
	ProfileID      int    `json:"profile_id"`
	IsEnabled      bool   `json:"is_enabled"`
}

type TimelineEvent struct {
	ID          int64  `json:"id"`
	SessionID   int64  `json:"session_id"`
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Metadata    string `json:"metadata"`
	Timestamp   string `json:"timestamp"`
}

type Scenario struct {
	ID          int64          `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Category    string         `json:"category"`
	Steps       []ScenarioStep `json:"steps"`
}

type ScenarioStep struct {
	ID                    int64  `json:"id"`
	ScenarioID            int64  `json:"scenario_id"`
	OrderIndex            int    `json:"order_index"`
	ToolID                int    `json:"tool_id"`
	ToolName              string `json:"tool_name,omitempty"`
	ProfileID             int    `json:"profile_id"`
	ProfileName           string `json:"profile_name,omitempty"`
	WaitForPrevious       bool   `json:"wait_for_previous"`
	AutoPropagateTargets bool   `json:"auto_propagate_targets"`
}
