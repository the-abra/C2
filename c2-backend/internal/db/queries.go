package db

import (
	"database/sql"
	"encoding/json"
)

type Store struct {
	DB *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{DB: db}
}

// Tool queries
func (s *Store) GetTools() ([]Tool, error) {
	rows, err := s.DB.Query("SELECT id, name, category, description, default_binary_name FROM tools")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tools []Tool
	for rows.Next() {
		var t Tool
		if err := rows.Scan(&t.ID, &t.Name, &t.Category, &t.Description, &t.DefaultBinaryName); err != nil {
			return nil, err
		}
		
		// Fetch profiles for this tool
		profiles, _ := s.GetAttackProfiles(t.ID)
		t.Profiles = profiles
		
		tools = append(tools, t)
	}
	return tools, nil
}

func (s *Store) GetAttackProfiles(toolID int) ([]AttackProfile, error) {
	rows, err := s.DB.Query("SELECT id, tool_id, name, args FROM attack_profiles WHERE tool_id = ?", toolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []AttackProfile
	for rows.Next() {
		var p AttackProfile
		var argsJSON string
		if err := rows.Scan(&p.ID, &p.ToolID, &p.Name, &argsJSON); err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(argsJSON), &p.Args)
		profiles = append(profiles, p)
	}
	return profiles, nil
}

func (s *Store) GetAttackProfileByID(id int) (*AttackProfile, error) {
	var p AttackProfile
	var argsJSON string
	err := s.DB.QueryRow("SELECT id, tool_id, name, args FROM attack_profiles WHERE id = ?", id).
		Scan(&p.ID, &p.ToolID, &p.Name, &argsJSON)
	if err != nil {
		return nil, err
	}
	json.Unmarshal([]byte(argsJSON), &p.Args)
	return &p, nil
}

// Scan history
func (s *Store) CreateScanEntry(toolID int, target, logPath string) (int64, error) {
	res, err := s.DB.Exec("INSERT INTO scan_history (tool_id, target, status, log_file_path) VALUES (?, ?, 'running', ?)",
		toolID, target, logPath)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateScanStatus(id int64, status string) error {
	_, err := s.DB.Exec("UPDATE scan_history SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?", status, id)
	return err
}

// Notes
func (s *Store) SaveNote(target, content string) error {
	_, err := s.DB.Exec("INSERT INTO markdown_notes (target, content) VALUES (?, ?) ON CONFLICT(target) DO UPDATE SET content=excluded.content, updated_at=CURRENT_TIMESTAMP",
		target, content)
	return err
}

func (s *Store) GetNote(target string) (string, error) {
	var content string
	err := s.DB.QueryRow("SELECT content FROM markdown_notes WHERE target = ?", target).Scan(&content)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return content, err
}

// AI Keys
func (s *Store) SaveAIKey(provider, model, key string) error {
	_, err := s.DB.Exec("INSERT INTO ai_configs (provider, model_name, api_key) VALUES (?, ?, ?)",
		provider, model, key)
	return err
}
