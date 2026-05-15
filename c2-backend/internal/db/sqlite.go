package db

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	"log"
)

func InitDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Create tables if they don't exist
	queries := []string{
		`CREATE TABLE IF NOT EXISTS tools (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			category TEXT,
			description TEXT,
			default_binary_name TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS attack_profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tool_id INTEGER,
			name TEXT NOT NULL,
			args TEXT NOT NULL, -- JSON array
			FOREIGN KEY(tool_id) REFERENCES tools(id)
		);`,
		`CREATE TABLE IF NOT EXISTS scan_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			tool_id INTEGER,
			target TEXT NOT NULL,
			start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			end_time DATETIME,
			status TEXT CHECK(status IN ('running', 'completed', 'killed', 'failed')),
			log_file_path TEXT,
			FOREIGN KEY(tool_id) REFERENCES tools(id)
		);`,
		`CREATE TABLE IF NOT EXISTS markdown_notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			target TEXT NOT NULL,
			content TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS ai_configs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			provider TEXT NOT NULL UNIQUE,
			model_name TEXT,
			api_key TEXT
		);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return nil, err
		}
	}

	// Run Seeder
	if err := SeedTools(db); err != nil {
		log.Printf("Seeding warning: %v", err)
	}

	log.Println("Database initialized successfully.")
	return db, nil
}
