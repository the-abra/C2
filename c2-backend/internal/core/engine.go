package core

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
	"github.com/creack/pty"
)

type Engine struct{}

func NewEngine() *Engine {
	return &Engine{}
}

func normalizeTarget(binary string, target string) string {
	// List of tools that prefer or require NO http/https prefix (Domain/IP only)
	needsNoPrefix := []string{"nmap", "amass", "subfinder", "naabu", "masscan", "dnsrecon", "medusa", "hydra"}

	// List of tools that REQUIRE an http/https prefix
	needsPrefix := []string{"ffuf", "gobuster", "feroxbuster", "nuclei", "nikto", "wpscan", "sqlmap", "commix", "dalfox", "tplmap", "httpx", "arjun"}

	hasPrefix := strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://")
	binLower := strings.ToLower(binary)

	for _, b := range needsNoPrefix {
		if b == binLower {
			if hasPrefix {
				t := strings.TrimPrefix(target, "http://")
				t = strings.TrimPrefix(t, "https://")
				return strings.TrimSuffix(t, "/")
			}
			return target
		}
	}

	for _, b := range needsPrefix {
		if b == binLower {
			if !hasPrefix {
				return "http://" + target
			}
			return target
		}
	}

	return target
}

func (e *Engine) Execute(ctx context.Context, binary string, args []string, target string, stdout, stderr io.Writer) error {
	// Normalize target based on tool requirements
	normalizedTarget := normalizeTarget(binary, target)

	// 1. Resolve Path & Custom Rules
	var cmdName string
	var finalArgs []string

	homeDir, _ := os.UserHomeDir()

	switch strings.ToLower(binary) {
	case "httpx":
		if p, err := exec.LookPath("httpx-toolkit"); err == nil {
			cmdName = p
		} else if p, err := exec.LookPath("httpx"); err == nil {
			cmdName = p
		} else {
			cmdName = filepath.Join(homeDir, "go", "bin", "httpx")
		}
	case "dalfox":
		if p, err := exec.LookPath("dalfox"); err == nil {
			cmdName = p
		} else {
			cmdName = filepath.Join(homeDir, "go", "bin", "dalfox")
		}
	case "tplmap":
		if _, err := os.Stat("/opt/tplmap/tplmap.py"); err == nil {
			cmdName = "python3"
			finalArgs = append(finalArgs, "/opt/tplmap/tplmap.py")
		} else {
			// Try to find in path
			if p, err := exec.LookPath("tplmap"); err == nil {
				cmdName = p
			} else {
				return fmt.Errorf("tplmap not found at /opt/tplmap/tplmap.py or in PATH")
			}
		}
	default:
		resolvedPath, err := exec.LookPath(binary)
		if err != nil {
			// Check /usr/bin/vendor_perl for Arch Linux users
			p := filepath.Join("/usr/bin/vendor_perl", binary)
			if _, err := os.Stat(p); err == nil {
				cmdName = p
			} else {
				return fmt.Errorf("tool binary not found in PATH: %s", binary)
			}
		} else {
			cmdName = resolvedPath
		}
	}

	// 2. Placeholder Replacement
	for _, arg := range args {
		processedArg := strings.ReplaceAll(arg, "<target>", normalizedTarget)
		finalArgs = append(finalArgs, processedArg)
	}

	// 3. Execution setup with PTY
	// Add a timeout context to prevent orphan processes
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(timeoutCtx, cmdName, finalArgs...)
	
	f, err := pty.Start(cmd)
	if err != nil {
		return err
	}
	defer f.Close()

	// Synchronize output reading
	done := make(chan struct{})
	go func() {
		io.Copy(stdout, f)
		close(done)
	}()

	err = cmd.Wait()
	<-done // Wait for all output to be copied
	return err
}
