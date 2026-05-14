package core

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type Engine struct{}

func NewEngine() *Engine {
	return &Engine{}
}

func (e *Engine) Execute(ctx context.Context, binary string, args []string, target string, stdout, stderr io.Writer) error {
	// 1. Resolve Path & Custom Rules
	var cmdName string
	var finalArgs []string

	homeDir, _ := os.UserHomeDir()

	switch strings.ToLower(binary) {
	case "httpx":
		// Check for httpx-toolkit or projectdiscovery httpx
		if p, err := exec.LookPath("httpx-toolkit"); err == nil {
			cmdName = p
		} else if p, err := exec.LookPath("httpx"); err == nil {
			cmdName = p
		} else {
			return fmt.Errorf("httpx not found")
		}
	case "dalfox":
		if p, err := exec.LookPath("dalfox"); err == nil {
			cmdName = p
		} else {
			cmdName = filepath.Join(homeDir, "go", "bin", "dalfox")
		}
	case "tplmap":
		// Custom execution: python3 /opt/tplmap/tplmap.py
		cmdName = "python3"
		finalArgs = append(finalArgs, "/opt/tplmap/tplmap.py")
	default:
		// Normal resolution via PATH
		resolvedPath, err := exec.LookPath(binary)
		if err != nil {
			return fmt.Errorf("tool binary not found in PATH: %s", binary)
		}
		cmdName = resolvedPath
	}

	// 2. Placeholder Replacement
	for _, arg := range args {
		processedArg := strings.ReplaceAll(arg, "<target>", target)
		finalArgs = append(finalArgs, processedArg)
	}

	// 3. Execution setup
	cmd := exec.CommandContext(ctx, cmdName, finalArgs...)
	cmd.Stdout = stdout
	cmd.Stderr = stderr
	cmd.Stdin = nil // Non-interactive tools

	return cmd.Run()
}
