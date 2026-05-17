package db

import (
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type ToolDefinition struct {
	Name        string `yaml:"name"`
	Category    string `yaml:"category"`
	Description string `yaml:"description"`
	Binary      string `yaml:"binary"`
	Profiles    []struct {
		Name string   `yaml:"name"`
		Args []string `yaml:"args"`
	} `yaml:"profiles"`
	Parsers []struct {
		Type  string `yaml:"type"`
		Regex string `yaml:"regex"`
	} `yaml:"parsers"`
}

func LoadToolsFromDir(db *sql.DB, toolsDir string) error {
	files, err := os.ReadDir(toolsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, f := range files {
		if !strings.HasSuffix(f.Name(), ".yaml") && !strings.HasSuffix(f.Name(), ".yml") {
			continue
		}

		path := filepath.Join(toolsDir, f.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("[!] Failed to read tool def %s: %v", path, err)
			continue
		}

		var def ToolDefinition
		if err := yaml.Unmarshal(data, &def); err != nil {
			log.Printf("[!] Failed to parse tool def %s: %v", path, err)
			continue
		}

		// 1. Insert Tool
		var toolID int64
		err = db.QueryRow("SELECT id FROM tools WHERE LOWER(name) = LOWER(?)", def.Name).Scan(&toolID)
		if err == sql.ErrNoRows {
			res, err := db.Exec("INSERT INTO tools (name, category, description, default_binary_name) VALUES (?, ?, ?, ?)",
				def.Name, def.Category, def.Description, def.Binary)
			if err != nil {
				return err
			}
			toolID, _ = res.LastInsertId()
		} else {
			db.Exec("UPDATE tools SET category = ?, description = ?, default_binary_name = ? WHERE id = ?",
				def.Category, def.Description, def.Binary, toolID)
		}

		// 2. Insert Profiles
		for _, p := range def.Profiles {
			argsJSON, _ := json.Marshal(p.Args)
			var profExists int
			db.QueryRow("SELECT 1 FROM attack_profiles WHERE tool_id = ? AND name = ?", toolID, p.Name).Scan(&profExists)
			if profExists == 0 {
				db.Exec("INSERT INTO attack_profiles (tool_id, name, args) VALUES (?, ?, ?)",
					toolID, p.Name, string(argsJSON))
			} else {
				db.Exec("UPDATE attack_profiles SET args = ? WHERE tool_id = ? AND name = ?",
					string(argsJSON), toolID, p.Name)
			}
		}

		// 3. Insert Parsers (Optional: We could store regexes in DB too, but for now we'll update parser.go to use them)
		// For V2, let's keep them in memory or just focus on Profiles for now.
	}

	return nil
}

func SeedTools(db *sql.DB) error {
	// Fallback seeder (the old one) can stay or be removed. 
	// I'll keep it for tools not yet converted to YAML.
	return nil
}
