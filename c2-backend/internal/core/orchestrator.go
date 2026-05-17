package core

import (
	"c2-backend/internal/ai"
	"c2-backend/internal/db"
	"c2-backend/internal/ws"
	"context"
	"fmt"
	"io"
	"log"
	"strings"
	"sync"
)

type Job struct {
	ID         int64
	SessionID  int64
	ScenarioID int64
	StepIndex  int
	Binary     string
	Args       []string
	Target     string
	Params     map[string]string
	LogFile    io.WriteCloser
	Hub        *ws.Hub
	Store      *db.Store
}

type JobOrchestrator struct {
	engine     *Engine
	store      *db.Store
	evidence   *EvidenceManager
	hub        *ws.Hub
	parser     *Parser
	chainer    *Chainer
	advisor    *Advisor
	activeJobs map[int64]context.CancelFunc
	jobQueue   chan *Job
	mu         sync.Mutex
	maxWorkers int
}

func NewJobOrchestrator(e *Engine, s *db.Store, ev *EvidenceManager, h *ws.Hub, a *ai.AIClient, maxWorkers int) *JobOrchestrator {
	orch := &JobOrchestrator{
		engine:     e,
		store:      s,
		evidence:   ev,
		hub:        h,
		activeJobs: make(map[int64]context.CancelFunc),
		jobQueue:   make(chan *Job, 100),
		maxWorkers: maxWorkers,
	}

	orch.parser = NewParser(s)
	orch.chainer = NewChainer(s, ev, h, orch.Submit)
	orch.advisor = NewAdvisor(a)

	for i := 0; i < maxWorkers; i++ {
		go orch.worker()
	}

	return orch
}

func (o *JobOrchestrator) worker() {
	for job := range o.jobQueue {
		o.executeJob(job)
	}
}

func (o *JobOrchestrator) Submit(job *Job) {
	o.jobQueue <- job
}

func (o *JobOrchestrator) RunScenario(sessionID, scenarioID int64, initialTarget string) chan bool {
	done := make(chan bool, 1)
	scenario, err := o.store.GetScenarioByID(scenarioID)
	if err != nil {
		log.Printf("[!] Scenario %d not found: %v", scenarioID, err)
		done <- false
		return done
	}

	log.Printf("[*] Starting Scenario '%s' on %s", scenario.Name, initialTarget)
	
	go func() {
		o.executeScenarioStep(sessionID, scenario, 0, []string{initialTarget})
		done <- true
	}()
	
	return done
}

func (o *JobOrchestrator) executeScenarioStep(sessionID int64, scenario *db.Scenario, stepIdx int, targets []string) {
	if stepIdx >= len(scenario.Steps) {
		log.Printf("[+] Scenario '%s' completed successfully.", scenario.Name)
		return
	}

	step := scenario.Steps[stepIdx]
	profile, err := o.store.GetAttackProfileByID(step.ProfileID)
	if err != nil {
		log.Printf("[!] Step %d profile not found: %v", stepIdx, err)
		return
	}
	
	log.Printf("[*] Scenario '%s': Step %d (%s) starting on %d targets", scenario.Name, stepIdx+1, step.ToolName, len(targets))

	var wg sync.WaitGroup

	for _, target := range targets {
		wg.Add(1)
		
		file, path, err := o.evidence.CreateEvidenceFile(target, step.ToolName)
		if err != nil {
			log.Printf("[!] Step failed to create evidence: %v", err)
			wg.Done()
			continue
		}

		scanID, _ := o.store.CreateScanEntry(sessionID, step.ToolID, target, path)
		
		job := &Job{
			ID:         scanID,
			SessionID:  sessionID,
			ScenarioID: scenario.ID,
			StepIndex:  stepIdx,
			Binary:     step.ToolName,
			Args:       profile.Args,
			Target:     target,
			Params:     make(map[string]string), // Scenarios use empty params for now or target propagation
			LogFile:    file,
			Hub:        o.hub,
			Store:      o.store,
		}

		go func(j *Job) {
			defer wg.Done()
			o.executeJob(j)
		}(job)
	}

	if step.WaitForPrevious {
		wg.Wait()
		
		nextTargets := []string{}
		if step.AutoPropagateTargets {
			discoveries, _ := o.store.GetDiscoveries(sessionID)
			for _, d := range discoveries {
				if d.Type == "domain" || d.Type == "ip" {
					nextTargets = append(nextTargets, d.Value)
				}
			}
		}

		if len(nextTargets) == 0 {
			nextTargets = targets
		}
		
		o.executeScenarioStep(sessionID, scenario, stepIdx+1, nextTargets)
	} else {
		go o.executeScenarioStep(sessionID, scenario, stepIdx+1, targets)
	}
}

func (o *JobOrchestrator) Kill(jobID int64) bool {
	o.mu.Lock()
	cancel, ok := o.activeJobs[jobID]
	o.mu.Unlock()

	if ok {
		cancel()
		return true
	}
	return false
}

func (o *JobOrchestrator) executeJob(job *Job) {
	ctx, cancel := context.WithCancel(context.Background())
	
	o.mu.Lock()
	o.activeJobs[job.ID] = cancel
	o.mu.Unlock()

	outputBuffer := &strings.Builder{}

	defer func() {
		job.LogFile.Close()
		cancel()
		o.mu.Lock()
		delete(o.activeJobs, job.ID)
		o.mu.Unlock()

		if outputBuffer.Len() > 0 {
			fullOutput := outputBuffer.String()
			discoveries := o.parser.ExtractEntities(job.Binary, job.ID, job.SessionID, fullOutput)
			
			for _, d := range discoveries {
				o.hub.BroadcastDiscovery(d)
				o.store.AddTimelineEvent(db.TimelineEvent{
					SessionID:   job.SessionID,
					Type:        "discovery",
					Title:       fmt.Sprintf("New %s Identified", strings.ToUpper(d.Type)),
					Description: d.Value,
				})
			}

			if len(discoveries) > 0 {
				o.chainer.Evaluate(discoveries)
			}
		}
	}()

	wsWriter := &ws.WSWriter{Hub: o.hub, SessionID: job.SessionID, ToolName: job.Binary}
	defer wsWriter.Close()
	
	multi := io.MultiWriter(job.LogFile, wsWriter, outputBuffer)

	err := o.engine.Execute(ctx, job.Binary, job.Args, job.Target, job.Params, multi, multi)

	status := "completed"
	if err != nil {
		status = "failed"
		if ctx.Err() == context.Canceled {
			status = "killed"
		}
		log.Printf("[!] Job %d failed: %v", job.ID, err)
	}

	o.store.UpdateScanStatus(job.ID, status)
	o.hub.BroadcastStatus(job.SessionID, job.Binary, status)

	o.store.AddTimelineEvent(db.TimelineEvent{
		SessionID:   job.SessionID,
		Type:        "job_finished",
		Title:       fmt.Sprintf("Finished %s", job.Binary),
		Description: fmt.Sprintf("Status: %s | Target: %s", status, job.Target),
	})
}

func (o *JobOrchestrator) RecoverState() {
	log.Println("[*] Recovering orchestrator state...")
	err := o.store.MarkStaleScansAsInterrupted()
	if err != nil {
		log.Printf("[!] State recovery failed: %v", err)
	}
}

func (o *JobOrchestrator) GetChainer() *Chainer {
	return o.chainer
}
