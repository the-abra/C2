package core

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type EvidenceManager struct {
	BaseDir string
}

func NewEvidenceManager(baseDir string) *EvidenceManager {
	return &EvidenceManager{BaseDir: baseDir}
}

func sanitizeTarget(target string) string {
	target = strings.TrimPrefix(target, "http://")
	target = strings.TrimPrefix(target, "https://")
	target = strings.TrimPrefix(target, "www.")
	target = strings.TrimRight(target, "/")
	target = strings.ReplaceAll(target, "/", "_")
	target = strings.ReplaceAll(target, "\\", "_")
	target = strings.ReplaceAll(target, ":", "_")
	return target
}

func (em *EvidenceManager) CreateEvidenceFile(target, toolName string) (*os.File, string, error) {
	sanitized := sanitizeTarget(target)
	targetDir := filepath.Join(em.BaseDir, "targets", sanitized)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return nil, "", err
	}

	timestamp := time.Now().Format("20060102_150405")
	fileName := fmt.Sprintf("%s_%s.txt", toolName, timestamp)
	filePath := filepath.Join(targetDir, fileName)

	file, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return nil, "", err
	}

	return file, filePath, nil
}

func (em *EvidenceManager) ListEvidenceFiles(target string) ([]string, error) {
	sanitized := sanitizeTarget(target)
	targetDir := filepath.Join(em.BaseDir, "targets", sanitized)
	files, err := os.ReadDir(targetDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}

	var filePaths []string
	for _, f := range files {
		if !f.IsDir() {
			filePaths = append(filePaths, f.Name())
		}
	}
	return filePaths, nil
}
