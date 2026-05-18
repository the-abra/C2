package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/abra/c2-backend/internal/models"
)

type FileRepository struct {
	DataDir     string
	Sessions    []models.Session
	Tools       []models.Tool
	History     []models.History
	Discoveries []models.Discovery
	Notes       []models.Note
	Scenarios   []models.Scenario
	mu          sync.RWMutex
}

var Store *FileRepository

func InitStore(dataDir string) (*FileRepository, error) {
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	repo := &FileRepository{
		DataDir: dataDir,
	}

	repo.loadAll()
	Store = repo
	return repo, nil
}

func (r *FileRepository) loadAll() {
	r.load("sessions.json", &r.Sessions)
	r.load("history.json", &r.History)
	r.load("discoveries.json", &r.Discoveries)
	r.load("notes.json", &r.Notes)
	r.load("scenarios.json", &r.Scenarios)
}

func (r *FileRepository) load(filename string, target interface{}) {
	path := filepath.Join(r.DataDir, filename)
	data, err := os.ReadFile(path)
	if err == nil {
		json.Unmarshal(data, target)
	}
}

func (r *FileRepository) save(filename string, source interface{}) {
	path := filepath.Join(r.DataDir, filename)
	data, _ := json.MarshalIndent(source, "", "  ")
	os.WriteFile(path, data, 0644)
}

// Session Methods
func (r *FileRepository) GetSessions() []models.Session {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Sessions
}

func (r *FileRepository) CreateSession(s *models.Session) {
	r.mu.Lock()
	defer r.mu.Unlock()
	s.ID = uint(len(r.Sessions) + 1)
	s.CreatedAt = time.Now()
	s.LastAccessedAt = time.Now()
	r.Sessions = append(r.Sessions, *s)
	r.save("sessions.json", r.Sessions)
}

func (r *FileRepository) DeleteSession(id uint) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, s := range r.Sessions {
		if s.ID == id {
			r.Sessions = append(r.Sessions[:i], r.Sessions[i+1:]...)
			break
		}
	}
	r.save("sessions.json", r.Sessions)
}

// Tool Methods
func (r *FileRepository) SetTools(tools []models.Tool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Tools = tools
}

func (r *FileRepository) GetTools() []models.Tool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Tools
}

func (r *FileRepository) GetTool(id uint) (models.Tool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, t := range r.Tools {
		if t.ID == id {
			return t, nil
		}
	}
	return models.Tool{}, fmt.Errorf("tool not found")
}

// History Methods
func (r *FileRepository) AddHistory(h *models.History) {
	r.mu.Lock()
	defer r.mu.Unlock()
	h.ID = uint(len(r.History) + 1)
	r.History = append(r.History, *h)
	r.save("history.json", r.History)
}

func (r *FileRepository) UpdateHistoryStatus(id uint, status string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, h := range r.History {
		if h.ID == id {
			r.History[i].Status = status
			r.History[i].EndTime = time.Now()
			break
		}
	}
	r.save("history.json", r.History)
}

func (r *FileRepository) GetHistory(sessionID uint) []models.History {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var res []models.History
	for _, h := range r.History {
		if h.SessionID == sessionID {
			res = append(res, h)
		}
	}
	return res
}

func (r *FileRepository) GetRunningHistory() []models.History {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var res []models.History
	for _, h := range r.History {
		if h.Status == "running" {
			res = append(res, h)
		}
	}
	return res
}

// Discovery Methods
func (r *FileRepository) AddDiscovery(d *models.Discovery) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// Check for duplicates
	for _, existing := range r.Discoveries {
		if existing.SessionID == d.SessionID && existing.Type == d.Type && existing.Value == d.Value {
			return
		}
	}
	d.ID = uint(len(r.Discoveries) + 1)
	d.CreatedAt = time.Now()
	r.Discoveries = append(r.Discoveries, *d)
	r.save("discoveries.json", r.Discoveries)
}

func (r *FileRepository) GetDiscoveries(sessionID uint) []models.Discovery {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var res []models.Discovery
	for _, d := range r.Discoveries {
		if d.SessionID == sessionID {
			res = append(res, d)
		}
	}
	return res
}

// Note Methods
func (r *FileRepository) GetNote(sessionID uint, target string) models.Note {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, n := range r.Notes {
		if n.SessionID == sessionID && n.Target == target {
			return n
		}
	}
	return models.Note{}
}

func (r *FileRepository) SaveNote(sessionID uint, target string, content string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	found := false
	for i, n := range r.Notes {
		if n.SessionID == sessionID && n.Target == target {
			r.Notes[i].Content = content
			r.Notes[i].UpdatedAt = time.Now()
			found = true
			break
		}
	}
	if !found {
		r.Notes = append(r.Notes, models.Note{
			ID:        uint(len(r.Notes) + 1),
			SessionID: sessionID,
			Target:    target,
			Content:   content,
			UpdatedAt: time.Now(),
		})
	}
	r.save("notes.json", r.Notes)
}

// Scenario Methods
func (r *FileRepository) GetScenarios() []models.Scenario {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Scenarios
}

func (r *FileRepository) CreateScenario(s *models.Scenario) {
	r.mu.Lock()
	defer r.mu.Unlock()
	s.ID = uint(len(r.Scenarios) + 1)
	r.Scenarios = append(r.Scenarios, *s)
	r.save("scenarios.json", r.Scenarios)
}

func (r *FileRepository) DeleteScenario(id uint) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, s := range r.Scenarios {
		if s.ID == id {
			r.Scenarios = append(r.Scenarios[:i], r.Scenarios[i+1:]...)
			break
		}
	}
	r.save("scenarios.json", r.Scenarios)
}
