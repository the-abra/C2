package db

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	"log"
)

func InitDB(dbPath string, toolsDir string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	queries := []string{
		`CREATE TABLE IF NOT EXISTS tools (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			category TEXT NOT NULL,
			description TEXT,
			default_binary_name TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS attack_profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tool_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			args TEXT NOT NULL, -- JSON array
			FOREIGN KEY(tool_id) REFERENCES tools(id)
		);`,
		`CREATE TABLE IF NOT EXISTS sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			target TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS scan_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id INTEGER,
			tool_id INTEGER,
			target TEXT NOT NULL,
			start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			end_time DATETIME,
			status TEXT CHECK(status IN ('running', 'completed', 'killed', 'failed', 'interrupted')),
			log_file_path TEXT,
			FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
			FOREIGN KEY(tool_id) REFERENCES tools(id)
		);`,
		`CREATE TABLE IF NOT EXISTS markdown_notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id INTEGER,
			target TEXT NOT NULL,
			content TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
			UNIQUE(session_id, target)
		);`,
		`CREATE TABLE IF NOT EXISTS ai_configs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			provider TEXT NOT NULL UNIQUE,
			model_name TEXT,
			api_key TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS discoveries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id INTEGER,
			type TEXT NOT NULL, -- domain | ip | service | vuln
			value TEXT NOT NULL,
			metadata TEXT, -- JSON blob
			source_scan_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
			FOREIGN KEY(source_scan_id) REFERENCES scan_history(id),
			UNIQUE(session_id, type, value) -- Avoid duplicates for same entity within same session
		);`,
		`CREATE TABLE IF NOT EXISTS automation_rules (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			trigger_type TEXT NOT NULL, -- domain | ip | service | vuln
			trigger_pattern TEXT, -- Optional regex or simple match
			tool_id INTEGER NOT NULL,
			profile_id INTEGER NOT NULL,
			is_enabled INTEGER DEFAULT 1,
			FOREIGN KEY(tool_id) REFERENCES tools(id),
			FOREIGN KEY(profile_id) REFERENCES attack_profiles(id)
		);`,
		`CREATE TABLE IF NOT EXISTS events_timeline (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			session_id INTEGER NOT NULL,
			type TEXT NOT NULL, -- job_started | job_finished | discovery | ai_insight | note_saved
			title TEXT NOT NULL,
			description TEXT,
			metadata TEXT, -- JSON blob
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS scenarios (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			description TEXT,
			category TEXT DEFAULT 'General'
		);`,
		`CREATE TABLE IF NOT EXISTS scenario_steps (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			scenario_id INTEGER NOT NULL,
			order_index INTEGER NOT NULL,
			tool_id INTEGER NOT NULL,
			profile_id INTEGER NOT NULL,
			wait_for_previous INTEGER DEFAULT 1,
			auto_propagate_targets INTEGER DEFAULT 1, -- Feed previous discoveries into this step
			FOREIGN KEY(scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
			FOREIGN KEY(tool_id) REFERENCES tools(id),
			FOREIGN KEY(profile_id) REFERENCES attack_profiles(id)
		);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return nil, err
		}
	}

	// 1. Seed Tools First
	if err := SeedTools(db); err != nil {
		log.Printf("Seeding warning: %v", err)
	}

	// 1b. Load Tools from YAML directory
	if err := LoadToolsFromDir(db, toolsDir); err != nil {
		log.Printf("YAML Seeding warning: %v", err)
	}

	// 2. Seed default Scenarios
	var scount int
	db.QueryRow("SELECT COUNT(*) FROM scenarios").Scan(&scount)
	if scount == 0 {
		res, _ := db.Exec("INSERT INTO scenarios (name, description, category) VALUES (?, ?, ?)",
			"Web Infrastructure Discovery", "Automated subdomain enumeration, service identification, and technology profiling.", "Recon")
		sid, _ := res.LastInsertId()

		var subID, subPID int
		db.QueryRow("SELECT id FROM tools WHERE default_binary_name = 'subfinder'").Scan(&subID)
		db.QueryRow("SELECT id FROM attack_profiles WHERE tool_id = ? AND name = 'Default Scan'", subID).Scan(&subPID)
		if subID > 0 {
			db.Exec("INSERT INTO scenario_steps (scenario_id, order_index, tool_id, profile_id) VALUES (?, 1, ?, ?)", sid, subID, subPID)
		}

		var hID, hPID int
		db.QueryRow("SELECT id FROM tools WHERE default_binary_name = 'httpx'").Scan(&hID)
		db.QueryRow("SELECT id FROM attack_profiles WHERE tool_id = ? AND name = 'Title & Status'", hID).Scan(&hPID)
		if hID > 0 {
			db.Exec("INSERT INTO scenario_steps (scenario_id, order_index, tool_id, profile_id) VALUES (?, 2, ?, ?)", sid, hID, hPID)
		}

		res, _ = db.Exec("INSERT INTO scenarios (name, description, category) VALUES (?, ?, ?)",
			"Rapid Service Profiling", "Identify active web services and perform a fast technological scan.", "Vulnerability")
		sid, _ = res.LastInsertId()

		db.QueryRow("SELECT id FROM tools WHERE default_binary_name = 'httpx'").Scan(&hID)
		db.QueryRow("SELECT id FROM attack_profiles WHERE tool_id = ? AND name = 'Title & Status'", hID).Scan(&hPID)
		if hID > 0 {
			db.Exec("INSERT INTO scenario_steps (scenario_id, order_index, tool_id, profile_id) VALUES (?, 1, ?, ?)", sid, hID, hPID)
		}

		var nID, nPID int
		db.QueryRow("SELECT id FROM tools WHERE default_binary_name = 'nuclei'").Scan(&nID)
		db.QueryRow("SELECT id FROM attack_profiles WHERE tool_id = ? AND name = 'Technological Profile'", nID).Scan(&nPID)
		if nID > 0 {
			db.Exec("INSERT INTO scenario_steps (scenario_id, order_index, tool_id, profile_id) VALUES (?, 2, ?, ?)", sid, nID, nPID)
		}
	}

	var count int
	db.QueryRow("SELECT COUNT(*) FROM automation_rules").Scan(&count)
	if count == 0 {
		defaultRules := []struct {
			name    string
			ttype   string
			tool    string
			profile string
		}{
			{"Auto-Scan Subdomains", "domain", "httpx", "Title & Status"},
			{"Auto-Scan IPs", "ip", "nmap", "Fast Scan (Top 100)"},
			{"Auto-Scan Services", "service", "nuclei", "Technological Profile"},
		}

		for _, r := range defaultRules {
			var tID, pID int
			db.QueryRow("SELECT id FROM tools WHERE default_binary_name = ? OR name = ?", r.tool, r.tool).Scan(&tID)
			db.QueryRow("SELECT id FROM attack_profiles WHERE tool_id = ? AND name = ?", tID, r.profile).Scan(&pID)
			if tID > 0 && pID > 0 {
				db.Exec("INSERT INTO automation_rules (name, trigger_type, tool_id, profile_id) VALUES (?, ?, ?, ?)",
					r.name, r.ttype, tID, pID)
			}
		}
	}

	log.Println("Database initialized successfully.")
	return db, nil
}
