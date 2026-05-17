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

// Session queries
func (s *Store) CreateSession(name, target string) (int64, error) {
	res, err := s.DB.Exec("INSERT INTO sessions (name, target) VALUES (?, ?)", name, target)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) GetSessions() ([]Session, error) {
	rows, err := s.DB.Query("SELECT id, name, target, created_at, last_accessed_at FROM sessions ORDER BY last_accessed_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := []Session{}
	for rows.Next() {
		var sess Session
		if err := rows.Scan(&sess.ID, &sess.Name, &sess.Target, &sess.CreatedAt, &sess.LastAccessedAt); err != nil {
			return nil, err
		}
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

func (s *Store) DeleteSession(id int64) error {
	_, err := s.DB.Exec("DELETE FROM sessions WHERE id = ?", id)
	return err
}

func (s *Store) UpdateSessionAccess(id int64) error {
	_, err := s.DB.Exec("UPDATE sessions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?", id)
	return err
}

// Tool queries
func (s *Store) GetTools() ([]Tool, error) {
	rows, err := s.DB.Query("SELECT id, name, category, description, default_binary_name FROM tools")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tools := []Tool{}
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
func (s *Store) CreateScanEntry(sessionID int64, toolID int, target, logPath string) (int64, error) {
	res, err := s.DB.Exec("INSERT INTO scan_history (session_id, tool_id, target, status, log_file_path) VALUES (?, ?, ?, 'running', ?)",
		sessionID, toolID, target, logPath)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateScanStatus(id int64, status string) error {
	_, err := s.DB.Exec("UPDATE scan_history SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?", status, id)
	return err
}

func (s *Store) MarkStaleScansAsInterrupted() error {
	_, err := s.DB.Exec("UPDATE scan_history SET status = 'interrupted', end_time = CURRENT_TIMESTAMP WHERE status = 'running'")
	return err
}

// Notes
func (s *Store) SaveNote(sessionID int64, target, content string) error {
	_, err := s.DB.Exec("INSERT INTO markdown_notes (session_id, target, content) VALUES (?, ?, ?) ON CONFLICT(session_id, target) DO UPDATE SET content=excluded.content, updated_at=CURRENT_TIMESTAMP",
		sessionID, target, content)
	return err
}

func (s *Store) GetNote(sessionID int64, target string) (string, error) {
	var content string
	err := s.DB.QueryRow("SELECT content FROM markdown_notes WHERE session_id = ? AND target = ?", sessionID, target).Scan(&content)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return content, err
}

// AI Keys
func (s *Store) SaveAIKey(provider, model, key string) error {
	_, err := s.DB.Exec("INSERT INTO ai_configs (provider, model_name, api_key) VALUES (?, ?, ?) ON CONFLICT(provider) DO UPDATE SET model_name=excluded.model_name, api_key=excluded.api_key",
		provider, model, key)
	return err
}

func (s *Store) GetAIConfigs() (map[string]map[string]string, error) {
	rows, err := s.DB.Query("SELECT provider, model_name, api_key FROM ai_configs")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make(map[string]map[string]string)
	for rows.Next() {
		var p, m, k string
		if err := rows.Scan(&p, &m, &k); err != nil {
			return nil, err
		}
		res[p] = map[string]string{"model": m, "key": k}
	}
	return res, nil
}

type ScanEntry struct {
	ID          int64  `json:"id"`
	SessionID   int64  `json:"session_id"`
	ToolID      int    `json:"tool_id"`
	ToolName    string `json:"tool_name"`
	Target      string `json:"target"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	Status      string `json:"status"`
	LogFilePath string `json:"log_file_path"`
}

func (s *Store) GetScanHistory(sessionID int64) ([]ScanEntry, error) {
	rows, err := s.DB.Query(`
		SELECT sh.id, sh.session_id, sh.tool_id, t.name, sh.target, sh.start_time, COALESCE(sh.end_time, ''), sh.status, sh.log_file_path 
		FROM scan_history sh
		JOIN tools t ON sh.tool_id = t.id
		WHERE sh.session_id = ?
		ORDER BY sh.start_time DESC
	`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	history := []ScanEntry{}
	for rows.Next() {
		var e ScanEntry
		if err := rows.Scan(&e.ID, &e.SessionID, &e.ToolID, &e.ToolName, &e.Target, &e.StartTime, &e.EndTime, &e.Status, &e.LogFilePath); err != nil {
			return nil, err
		}
		history = append(history, e)
	}
	return history, nil
}

// Discoveries
func (s *Store) SaveDiscovery(d Discovery) error {
	_, err := s.DB.Exec(`
		INSERT INTO discoveries (session_id, type, value, metadata, source_scan_id) 
		VALUES (?, ?, ?, ?, ?) 
		ON CONFLICT(session_id, type, value) DO UPDATE SET 
			metadata=excluded.metadata, 
			source_scan_id=excluded.source_scan_id
	`, d.SessionID, d.Type, d.Value, d.Metadata, d.SourceScanID)
	return err
}

func (s *Store) GetDiscoveries(sessionID int64) ([]Discovery, error) {
	rows, err := s.DB.Query(`
		SELECT id, session_id, type, value, COALESCE(metadata, ''), COALESCE(source_scan_id, 0), created_at 
		FROM discoveries 
		WHERE session_id = ? 
		ORDER BY created_at DESC
	`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	discoveries := []Discovery{}
	for rows.Next() {
		var d Discovery
		if err := rows.Scan(&d.ID, &d.SessionID, &d.Type, &d.Value, &d.Metadata, &d.SourceScanID, &d.CreatedAt); err != nil {
			return nil, err
		}
		discoveries = append(discoveries, d)
	}
	return discoveries, nil
}

// Automation Rules
func (s *Store) GetAutomationRules() ([]AutomationRule, error) {
	rows, err := s.DB.Query("SELECT id, name, trigger_type, COALESCE(trigger_pattern, ''), tool_id, profile_id, is_enabled FROM automation_rules")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []AutomationRule
	for rows.Next() {
		var r AutomationRule
		if err := rows.Scan(&r.ID, &r.Name, &r.TriggerType, &r.TriggerPattern, &r.ToolID, &r.ProfileID, &r.IsEnabled); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	return rules, nil
}

func (s *Store) CreateAutomationRule(r AutomationRule) (int64, error) {
	res, err := s.DB.Exec("INSERT INTO automation_rules (name, trigger_type, trigger_pattern, tool_id, profile_id) VALUES (?, ?, ?, ?, ?)",
		r.Name, r.TriggerType, r.TriggerPattern, r.ToolID, r.ProfileID)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func (s *Store) UpdateAutomationRule(r AutomationRule) error {
	_, err := s.DB.Exec("UPDATE automation_rules SET name=?, trigger_type=?, trigger_pattern=?, tool_id=?, profile_id=?, is_enabled=? WHERE id=?",
		r.Name, r.TriggerType, r.TriggerPattern, r.ToolID, r.ProfileID, r.IsEnabled, r.ID)
	return err
}

func (s *Store) DeleteAutomationRule(id int64) error {
	_, err := s.DB.Exec("DELETE FROM automation_rules WHERE id=?", id)
	return err
}

func (s *Store) ToggleAutomationRule(id int64, enabled bool) error {
	_, err := s.DB.Exec("UPDATE automation_rules SET is_enabled=? WHERE id=?", enabled, id)
	return err
}

// Scenarios
func (s *Store) GetScenarios() ([]Scenario, error) {
	rows, err := s.DB.Query("SELECT id, name, description, category FROM scenarios")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scenarios []Scenario
	for rows.Next() {
		var sc Scenario
		if err := rows.Scan(&sc.ID, &sc.Name, &sc.Description, &sc.Category); err != nil {
			return nil, err
		}
		
		// Fetch steps
		steps, _ := s.GetScenarioSteps(sc.ID)
		sc.Steps = steps
		
		scenarios = append(scenarios, sc)
	}
	return scenarios, nil
}

func (s *Store) GetScenarioSteps(scenarioID int64) ([]ScenarioStep, error) {
	rows, err := s.DB.Query(`
		SELECT ss.id, ss.scenario_id, ss.order_index, ss.tool_id, t.default_binary_name, ss.profile_id, ap.name, ss.wait_for_previous, ss.auto_propagate_targets
		FROM scenario_steps ss
		JOIN tools t ON ss.tool_id = t.id
		JOIN attack_profiles ap ON ss.profile_id = ap.id
		WHERE ss.scenario_id = ?
		ORDER BY ss.order_index ASC
	`, scenarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var steps []ScenarioStep
	for rows.Next() {
		var st ScenarioStep
		if err := rows.Scan(&st.ID, &st.ScenarioID, &st.OrderIndex, &st.ToolID, &st.ToolName, &st.ProfileID, &st.ProfileName, &st.WaitForPrevious, &st.AutoPropagateTargets); err != nil {
			return nil, err
		}
		steps = append(steps, st)
	}
	return steps, nil
}

func (s *Store) GetScenarioByID(id int64) (*Scenario, error) {
	var sc Scenario
	err := s.DB.QueryRow("SELECT id, name, description, category FROM scenarios WHERE id = ?", id).
		Scan(&sc.ID, &sc.Name, &sc.Description, &sc.Category)
	if err != nil {
		return nil, err
	}
	steps, _ := s.GetScenarioSteps(sc.ID)
	sc.Steps = steps
	return &sc, nil
}

// Timeline
func (s *Store) AddTimelineEvent(e TimelineEvent) error {
	_, err := s.DB.Exec("INSERT INTO events_timeline (session_id, type, title, description, metadata) VALUES (?, ?, ?, ?, ?)",
		e.SessionID, e.Type, e.Title, e.Description, e.Metadata)
	return err
}

func (s *Store) GetTimeline(sessionID int64) ([]TimelineEvent, error) {
	rows, err := s.DB.Query("SELECT id, session_id, type, title, COALESCE(description, ''), COALESCE(metadata, ''), timestamp FROM events_timeline WHERE session_id = ? ORDER BY timestamp DESC", sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []TimelineEvent
	for rows.Next() {
		var e TimelineEvent
		if err := rows.Scan(&e.ID, &e.SessionID, &e.Type, &e.Title, &e.Description, &e.Metadata, &e.Timestamp); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

func (s *Store) ClearTimeline(sessionID int64) error {
	_, err := s.DB.Exec("DELETE FROM events_timeline WHERE session_id = ?", sessionID)
	return err
}

// Global Asset Search
type AssetOccurrence struct {
	SessionID   int64  `json:"session_id"`
	SessionName string `json:"session_name"`
	Type        string `json:"type"`
	Value       string `json:"value"`
	CreatedAt   string `json:"created_at"`
}

func (s *Store) GlobalSearch(query string) ([]AssetOccurrence, error) {
	rows, err := s.DB.Query(`
		SELECT d.session_id, sess.name, d.type, d.value, d.created_at 
		FROM discoveries d
		JOIN sessions sess ON d.session_id = sess.id
		WHERE d.value LIKE ?
		ORDER BY d.created_at DESC
	`, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []AssetOccurrence
	for rows.Next() {
		var o AssetOccurrence
		if err := rows.Scan(&o.SessionID, &o.SessionName, &o.Type, &o.Value, &o.CreatedAt); err != nil {
			return nil, err
		}
		results = append(results, o)
	}
	return results, nil
}

func (s *Store) GetAllAssets() ([]AssetOccurrence, error) {
	rows, err := s.DB.Query(`
		SELECT d.session_id, sess.name, d.type, d.value, d.created_at 
		FROM discoveries d
		JOIN sessions sess ON d.session_id = sess.id
		GROUP BY d.type, d.value
		ORDER BY d.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []AssetOccurrence
	for rows.Next() {
		var o AssetOccurrence
		if err := rows.Scan(&o.SessionID, &o.SessionName, &o.Type, &o.Value, &o.CreatedAt); err != nil {
			return nil, err
		}
		results = append(results, o)
	}
	return results, nil
}
