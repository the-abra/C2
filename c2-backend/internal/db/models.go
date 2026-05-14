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

type ScanHistory struct {
	ID          int64  `json:"id"`
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
