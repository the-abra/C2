package engine

import (
	"bufio"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/abra/c2-backend/internal/models"
	"github.com/abra/c2-backend/internal/repository"
	"github.com/abra/c2-backend/internal/ws"
)

type ExecutionEngine struct {
	Hub    *ws.Hub
	active map[uint]*exec.Cmd
	mu     sync.Mutex
}

func NewExecutionEngine(hub *ws.Hub) *ExecutionEngine {
	return &ExecutionEngine{
		Hub:    hub,
		active: make(map[uint]*exec.Cmd),
	}
}

func (e *ExecutionEngine) RunTool(sessionID uint, tool models.Tool, profile models.AttackProfile, target string, params map[string]string) (uint, error) {
	history := models.History{
		SessionID: sessionID,
		ToolID:    tool.ID,
		ToolName:  tool.Name,
		ProfileID: profile.ID,
		Target:    target,
		Status:    "running",
		StartTime: time.Now(),
	}
	repository.Store.AddHistory(&history)

	args := make([]string, len(profile.Args))
	for i, arg := range profile.Args {
		res := strings.ReplaceAll(arg, "{{TARGET}}", target)
		for k, v := range params {
			res = strings.ReplaceAll(res, fmt.Sprintf("{{%s}}", strings.ToUpper(k)), v)
		}
		args[i] = res
	}

	cmd := exec.Command(tool.DefaultBinaryName, args...)
	
	e.mu.Lock()
	e.active[history.ID] = cmd
	e.mu.Unlock()

	go e.monitorProcess(history.ID, sessionID, tool, cmd)

	return history.ID, nil
}

func (e *ExecutionEngine) KillProcess(scanID uint) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if cmd, ok := e.active[scanID]; ok {
		if cmd.Process != nil {
			return cmd.Process.Kill()
		}
	}
	return fmt.Errorf("process not found or not running")
}

func (e *ExecutionEngine) monitorProcess(historyID uint, sessionID uint, tool models.Tool, cmd *exec.Cmd) {
	defer func() {
		e.mu.Lock()
		delete(e.active, historyID)
		e.mu.Unlock()
	}()

	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	
	if err := cmd.Start(); err != nil {
		repository.Store.UpdateHistoryStatus(historyID, "failed")
		e.Hub.Broadcast(ws.WSMessage{
			Type:      "status",
			Tool:      tool.Name,
			SessionID: sessionID,
			Payload:   "failed",
		})
		return
	}

	e.Hub.Broadcast(ws.WSMessage{
		Type:      "status",
		Tool:      tool.Name,
		SessionID: sessionID,
		Payload:   "running",
	})

	var wg sync.WaitGroup
	wg.Add(2)

	processScanner := func(scanner *bufio.Scanner) {
		defer wg.Done()
		for scanner.Scan() {
			line := scanner.Text()
			
			e.Hub.Broadcast(ws.WSMessage{
				Type:      "log",
				Tool:      tool.Name,
				SessionID: sessionID,
				Payload:   line + "\n",
			})

			e.runParsers(sessionID, historyID, tool, line)
		}
	}

	go processScanner(bufio.NewScanner(stdout))
	go processScanner(bufio.NewScanner(stderr))

	wg.Wait()
	err := cmd.Wait()

	status := "completed"
	if err != nil {
		if strings.Contains(err.Error(), "killed") || strings.Contains(err.Error(), "signal: killed") {
			status = "killed"
		} else {
			status = "failed"
		}
	}

	repository.Store.UpdateHistoryStatus(historyID, status)
	e.Hub.Broadcast(ws.WSMessage{
		Type:      "status",
		Tool:      tool.Name,
		SessionID: sessionID,
		Payload:   status,
	})
}

func (e *ExecutionEngine) runParsers(sessionID uint, historyID uint, tool models.Tool, line string) {
	for _, p := range tool.Parsers {
		re, err := regexp.Compile(p.Regex)
		if err != nil {
			continue
		}
		matches := re.FindAllStringSubmatch(line, -1)
		for _, match := range matches {
			val := match[0]
			if len(match) > 1 {
				val = match[1]
			}

			discovery := models.Discovery{
				SessionID:    sessionID,
				Type:         p.Type,
				Value:        val,
				Metadata:     fmt.Sprintf("Found by %s", tool.Name),
				SourceScanID: historyID,
				CreatedAt:    time.Now(),
			}

			repository.Store.AddDiscovery(&discovery)
			e.Hub.Broadcast(ws.WSMessage{
				Type:      "discovery",
				SessionID: sessionID,
				Data:      discovery,
			})
		}
	}
}
