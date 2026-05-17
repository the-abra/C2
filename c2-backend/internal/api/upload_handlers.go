package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
)


func (h *Handler) ListUploads(w http.ResponseWriter, r *http.Request) {
	if _, err := os.Stat(h.UploadDir); os.IsNotExist(err) {
		os.MkdirAll(h.UploadDir, 0755)
	}

	files, err := os.ReadDir(h.UploadDir)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var uploads []string
	for _, f := range files {
		if !f.IsDir() {
			uploads = append(uploads, f.Name())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(uploads)
}

func (h *Handler) UploadFile(w http.ResponseWriter, r *http.Request) {
	if _, err := os.Stat(h.UploadDir); os.IsNotExist(err) {
		os.MkdirAll(h.UploadDir, 0755)
	}

	r.ParseMultipartForm(32 << 20) // 32MB max
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Sanitize filename
	filename := filepath.Base(header.Filename)
	dstPath := filepath.Join(h.UploadDir, filename)

	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"filename": filename})
}

func (h *Handler) DeleteUpload(w http.ResponseWriter, r *http.Request) {
	filename := r.URL.Query().Get("filename")
	if filename == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}

	// Sanitize to prevent path traversal
	filename = filepath.Base(filename)
	filePath := filepath.Join(h.UploadDir, filename)

	if err := os.Remove(filePath); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
