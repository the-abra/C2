package api

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
)

func (h *Handler) GetFilesTree(w http.ResponseWriter, r *http.Request) {
	baseDir := h.Evidence.BaseDir
	targetsDir := filepath.Join(baseDir, "targets")

	type FileNode struct {
		Name string `json:"name"`
		Type string `json:"type"` // "file" or "folder"
		Path string `json:"path,omitempty"`
	}

	tree := make(map[string][]FileNode)

	entries, err := os.ReadDir(targetsDir)
	if err != nil {
		if os.IsNotExist(err) {
			json.NewEncoder(w).Encode(tree)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			targetName := entry.Name()
			targetPath := filepath.Join(targetsDir, targetName)
			files, err := os.ReadDir(targetPath)
			if err == nil {
				var fileNodes []FileNode
				for _, f := range files {
					if !f.IsDir() && filepath.Ext(f.Name()) == ".txt" {
						fileNodes = append(fileNodes, FileNode{
							Name: f.Name(),
							Type: "file",
						})
					}
				}
				tree[targetName] = fileNodes
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tree)
}

func (h *Handler) GetFileContent(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	file := r.URL.Query().Get("file")

	if target == "" || file == "" {
		http.Error(w, "target and file parameters are required", http.StatusBadRequest)
		return
	}

	if filepath.Clean(target) != target || filepath.Clean(file) != file || filepath.IsAbs(target) || filepath.IsAbs(file) || filepath.Dir(file) != "." {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	filePath := filepath.Join(h.Evidence.BaseDir, "targets", target, file)
	content, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "file not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Write(content)
}

func (h *Handler) CreateFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Target   string `json:"target"`
		Filename string `json:"filename"`
		Content  string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if filepath.Clean(req.Target) != req.Target || filepath.Clean(req.Filename) != req.Filename || filepath.IsAbs(req.Target) || filepath.IsAbs(req.Filename) || filepath.Dir(req.Filename) != "." {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	targetDir := filepath.Join(h.Evidence.BaseDir, "targets", req.Target)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	filePath := filepath.Join(targetDir, req.Filename)
	if err := os.WriteFile(filePath, []byte(req.Content), 0644); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (h *Handler) EditFile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Target   string `json:"target"`
		Filename string `json:"filename"`
		Content  string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if filepath.Clean(req.Target) != req.Target || filepath.Clean(req.Filename) != req.Filename || filepath.IsAbs(req.Target) || filepath.IsAbs(req.Filename) || filepath.Dir(req.Filename) != "." {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	filePath := filepath.Join(h.Evidence.BaseDir, "targets", req.Target, req.Filename)
	if err := os.WriteFile(filePath, []byte(req.Content), 0644); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) DeleteFile(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	file := r.URL.Query().Get("file")
	if target == "" || file == "" {
		http.Error(w, "missing params", http.StatusBadRequest)
		return
	}
	if filepath.Clean(target) != target || filepath.Clean(file) != file || filepath.IsAbs(target) || filepath.IsAbs(file) || filepath.Dir(file) != "." {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	filePath := filepath.Join(h.Evidence.BaseDir, "targets", target, file)
	if err := os.Remove(filePath); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
