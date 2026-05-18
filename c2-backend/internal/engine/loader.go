package engine

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/abra/c2-backend/internal/models"
	"github.com/abra/c2-backend/internal/repository"
	"gopkg.in/yaml.v3"
)

type ToolYAML struct {
	Name        string `yaml:"name"`
	Category    string `yaml:"category"`
	Description string `yaml:"description"`
	Binary      string `yaml:"binary"`
	Profiles    []struct {
		Name      string   `yaml:"name"`
		Args      []string `yaml:"args"`
		Rationale string   `yaml:"rationale"`
	} `yaml:"profiles"`
	Parsers []struct {
		Type  string `yaml:"type"`
		Regex string `yaml:"regex"`
	} `yaml:"parsers"`
}

func LoadTools(toolsDir string) error {
	files, err := os.ReadDir(toolsDir)
	if err != nil {
		return err
	}

	var allTools []models.Tool
	var toolID uint = 1
	var profileID uint = 1
	var parserID uint = 1

	for _, file := range files {
		if filepath.Ext(file.Name()) != ".yaml" {
			continue
		}

		path := filepath.Join(toolsDir, file.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			fmt.Printf("Error reading %s: %v\n", path, err)
			continue
		}

		var ty ToolYAML
		if err := yaml.Unmarshal(data, &ty); err != nil {
			fmt.Printf("Error parsing %s: %v\n", path, err)
			continue
		}

		_, err = exec.LookPath(ty.Binary)
		isInstalled := err == nil

		tool := models.Tool{
			ID:                toolID,
			Name:              ty.Name,
			Category:          ty.Category,
			Description:       ty.Description,
			DefaultBinaryName: ty.Binary,
			IsInstalled:       isInstalled,
		}
		toolID++

		for _, p := range ty.Profiles {
			profile := models.AttackProfile{
				ID:        profileID,
				ToolID:    tool.ID,
				Name:      p.Name,
				Args:      p.Args,
				Rationale: p.Rationale,
			}
			tool.Profiles = append(tool.Profiles, profile)
			profileID++
		}

		for _, p := range ty.Parsers {
			parser := models.Parser{
				ID:     parserID,
				ToolID: tool.ID,
				Type:   p.Type,
				Regex:  p.Regex,
			}
			tool.Parsers = append(tool.Parsers, parser)
			parserID++
		}

		allTools = append(allTools, tool)
	}

	repository.Store.SetTools(allTools)
	return nil
}
