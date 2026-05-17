'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ConnectionOverlay } from './connection-overlay'
import { Sidebar } from './sidebar'
import { HeaderBar } from './header-bar'
import { TerminalView } from './terminal-view'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useC2Engine, type ProcessStatus } from '@/hooks/use-c2-engine'
import dynamic from 'next/dynamic'
import { CommandPalette } from './command-palette'
import { useC2Store, type TerminalSession } from '@/hooks/use-c2-store'
import { SessionManager } from './session-manager'
import { AutomationCenter } from './automation-center'
import { TacticalTimeline } from './tactical-timeline'
import { AssetLibrary } from './asset-library'
import { ParameterPrompt } from './parameter-prompt'
import { X, Plus, Terminal as TerminalIcon, Binary, Shield, Layout, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Dynamic imports
const VisualGraph = dynamic(() => import('./visual-graph').then(m => m.VisualGraph), { ssr: false })
const ReportModal = dynamic(() => import('./report-modal').then(m => m.ReportModal), { ssr: false })
const EvidenceModal = dynamic(() => import('./evidence-modal').then(m => m.EvidenceModal), { ssr: false })
const HistoryModal = dynamic(() => import('./history-modal').then(m => m.HistoryModal), { ssr: false })
const NotesModal = dynamic(() => import('./notes-modal').then(m => m.NotesModal), { ssr: false })
const AIConfigModal = dynamic(() => import('./ai-config-modal').then(m => m.AIConfigModal), { ssr: false })
const AIPanel = dynamic(() => import('./ai-panel').then(m => m.AIPanel), { ssr: false })
const UploadManager = dynamic(() => import('./upload-manager').then(m => m.UploadManager), { ssr: false })
const ShellPanel = dynamic(() => import('@/components/c2/shell-panel').then(m => m.ShellPanel), { ssr: false })

import { Button } from '@/components/ui/button'
import {
  connectToBackend,
  runTool,
  killScan,
  fetchTools,
  fetchScenarios,
  runScenario,
  fetchAutomationStatus,
  toggleAutomation,
  fetchDiscoveries,
  type Tool,
  type Category,
  type AttackProfile,
  type Discovery,
  type Scenario
} from '@/lib/api-service'

export function Dashboard() {
  const { toast } = useToast()
  const store = useC2Store()
  const [mounted, setMounted] = useState(false)
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<{ target: string; filename: string }[]>([])
  
  // Parameter Prompt State
  const [paramPrompt, setParamPrompt] = useState<{ 
    isOpen: boolean, 
    title: string, 
    description: string, 
    parameters: string[], 
    onConfirm: (p: Record<string, string>) => void 
  }>({ isOpen: false, title: '', description: '', parameters: [], onConfirm: () => {} })

  const storeRef = useRef(store)
  useEffect(() => { storeRef.current = store }, [store])

  useEffect(() => { setMounted(true) }, [])

  const engineCallbacks = useMemo(() => ({
    onDiscovery: (d: Discovery) => {
      if (!d || d.session_id !== storeRef.current.currentSessionId) return
      const s = storeRef.current
      s.setDiscoveries([d, ...(s.discoveries || [])].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i))
      toast({ title: 'Team Discovery', description: `${d.type.toUpperCase()}: ${d.value}` })
    },
    onNoteUpdate: (target: string) => {
      toast({ title: 'Intelligence Updated', description: `Notes updated for: ${target}` })
    },
    onAIAdvice: (tool: string, target: string, advice: string) => {
      toast({ title: 'AI Insight', description: `${tool.toUpperCase()} on ${target}: ${advice}` })
    }
  }), [toast])

  const { allLogs, setAllLogs, statuses, setStatuses } = useC2Engine(
    store.backendUrl, 
    store.connected && !!store.currentSessionId && mounted, 
    store.currentSessionId,
    engineCallbacks
  )

  const selectedTool = useMemo(() => 
    (store.tools || []).find((t: Tool) => t.id === store.selectedToolId),
  [store.tools, store.selectedToolId])

  const selectedProfile = useMemo(() => 
    selectedTool?.profiles?.find((p: AttackProfile) => p.id === store.selectedProfileId),
  [selectedTool, store.selectedProfileId])

  const activeToolStatus = selectedTool ? (statuses[selectedTool.default_binary_name] || 'idle') : 'idle'

  const fetchUploads = useCallback(async () => {
    if (!store.connected) return
    try {
      const res = await fetch(`${store.backendUrl}/api/uploads`)
      if (res.ok) {
        const data = await res.json()
        store.setUploads(data || [])
      }
    } catch (e) { console.error(e) }
  }, [store.backendUrl, store.connected, store.setUploads])

  useEffect(() => {
    if (store.connected && store.currentSessionId && mounted) {
      fetchTools(store.backendUrl).then(data => {
        const tools = data || []
        store.setTools(tools)
        const cats: Record<string, Tool[]> = {}
        tools.forEach(t => {
          if (t && t.category) {
            if (!cats[t.category]) cats[t.category] = []
            cats[t.category].push(t)
          }
        })
        store.setCategories(Object.entries(cats).map(([label, tools]) => ({ label, tools })))
        if (tools.length > 0 && !store.selectedToolId && !store.selectedScenarioId) store.setSelectedToolId(tools[0].id)
      }).catch(() => {})

      fetchScenarios(store.backendUrl).then(data => {
        store.setScenarios(data || [])
      }).catch(() => {})

      fetchDiscoveries(store.backendUrl, store.currentSessionId).then(data => store.setDiscoveries(data || []))
      fetchAutomationStatus(store.backendUrl).then(data => { if (data) store.setAutoPilotEnabled(data.is_enabled) })
      fetchUploads()
    }
  }, [store.connected, store.currentSessionId, mounted, store.backendUrl, fetchUploads])

  const handleConnect = async (url: string) => {
    try {
      await connectToBackend(url)
      store.setBackendUrl(url)
      store.setConnected(true)
    } catch { toast({ title: 'Error', description: 'Backend Unreachable', variant: 'destructive' }) }
  }

  const handleExecute = async (extraParams: Record<string, string> = {}) => {
    if (!selectedTool || !store.selectedProfileId || !store.target.trim() || !store.currentSessionId) return

    // Parameter Detection
    if (Object.keys(extraParams).length === 0) {
      const profile = selectedTool.profiles?.find(p => p.id === store.selectedProfileId)
      if (profile) {
        const required = Array.from(new Set(profile.args.join(' ').match(/{{([A-Z0-9_]+)}}/g)?.map(m => m.replace(/{{|}}/g, '')) || []))
        if (required.length > 0) {
          setParamPrompt({
            isOpen: true,
            title: `Tool Engagement: ${selectedTool.name}`,
            description: `Execute ${profile.name} Attack Profile.`,
            parameters: required,
            onConfirm: (p) => handleExecute(p)
          })
          return
        }
      }
    }

    try {
      setStatuses((prev) => ({ ...prev, [selectedTool.default_binary_name]: 'running' }))
      
      store.addTerminalSession({
        id: selectedTool.default_binary_name,
        title: selectedTool.name,
        type: 'tool',
        toolName: selectedTool.default_binary_name
      })

      const data = await runTool({
        sessionId: store.currentSessionId,
        toolId: selectedTool.id,
        profileId: store.selectedProfileId,
        target: store.target,
        params: extraParams
      }, store.backendUrl)
      
      store.setScanId(selectedTool.default_binary_name, data.scan_id)
    } catch (e: any) {
      setStatuses((prev) => ({ ...prev, [selectedTool.default_binary_name]: 'error' }))
      toast({ title: 'Execution Failed', description: e.message, variant: 'destructive' })
    }
  }

  const handleRunScenario = async (extraParams: Record<string, string> = {}) => {
    const scenario = store.scenarios.find(s => s.id === store.selectedScenarioId)
    if (!scenario || !store.target.trim()) return

    // Parameter Detection for ALL steps
    if (Object.keys(extraParams).length === 0) {
      const allArgs = scenario.steps.map(s => store.tools.find(t => t.id === s.tool_id)?.profiles?.find(p => p.id === s.profile_id)?.args.join(' ') || '').join(' ')
      const matches = allArgs.match(/{{([A-Z0-9_]+)}}/g) || []
      const required = Array.from(new Set<string>(matches.map((m: string) => m.replace(/{{|}}/g, ''))))
      
      if (required.length > 0) {
        setParamPrompt({
          isOpen: true,
          title: `Mission Briefing: ${scenario.name}`,
          description: `Defining mission-wide parameters for multi-step orchestration.`,
          parameters: required,
          onConfirm: (p) => handleRunScenario(p)
        })
        return
      }
    }

    try {
      await runScenario(store.backendUrl, store.currentSessionId || 0, scenario.id, store.target, extraParams)
      toast({ title: "Scenario Engaged", description: `Mission '${scenario.name}' is now active.` })
    } catch (e: any) {
      toast({ title: "Engagement Failed", description: e.message, variant: "destructive" })
    }
  }

  const handleToggleAutoPilot = async (enabled: boolean) => {
    try {
      const ok = await toggleAutomation(enabled, store.backendUrl)
      if (ok) {
        store.setAutoPilotEnabled(enabled)
        toast({ title: enabled ? 'Auto-Pilot Engaged' : 'Auto-Pilot Disengaged' })
      }
    } catch (e: any) { toast({ title: 'Toggle Failed', description: e.message, variant: 'destructive' }) }
  }

  const handleCancel = async () => {
    if (!selectedTool) return
    const sId = store.scanIds[selectedTool.default_binary_name]
    if (sId) {
      await killScan(sId, store.backendUrl)
      setStatuses((prev) => ({ ...prev, [selectedTool.default_binary_name]: 'idle' }))
    }
  }

  const handleToggleEvidenceFile = (target: string, filename: string) => {
    setSelectedEvidenceFiles((prev) => {
      const exists = prev.find((f) => f.target === target && f.filename === filename)
      if (exists) return prev.filter((f) => !(f.target === target && f.filename === filename))
      return [...prev, { target, filename }]
    })
  }

  if (!mounted) return null

  return (
    <>
      <CommandPalette />
      {!store.connected && <ConnectionOverlay onConnect={handleConnect} />}
      {store.connected && !store.currentSessionId && <SessionManager />}

      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          <div className="absolute inset-0 bg-tactical-grid opacity-[0.03]" />
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
            <Sidebar
              categories={store.categories || []}
              selectedToolId={store.selectedToolId}
              onSelectTool={(id) => {
                store.setSelectedScenarioId(null)
                store.setSelectedToolId(id)
                const t = (store.tools || []).find((x: Tool) => x.id === id)
                if (t?.profiles?.length) store.setSelectedProfileId(t.profiles[0].id)
              }}
              processStatus={statuses}
              backendUrl={store.backendUrl}
              onOpenAI={() => store.setModalOpen('aIPanel', true)}
              onOpenShell={() => store.setModalOpen('shell', true)}
              onOpenHistory={() => store.setModalOpen('history', true)}
              onOpenReport={() => store.setModalOpen('report', true)}
              selectedEvidenceCount={selectedEvidenceFiles.length}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/30 transition-colors" />

          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="flex flex-col h-full min-w-0 min-h-0 overflow-hidden relative z-10 backdrop-blur-[1px]">
              <HeaderBar
                selectedToolName={selectedTool?.name || 'No Tool'}
                processStatus={activeToolStatus}
                target={store.target || ''}
                onTargetChange={store.setTarget}
                selectedProfile={selectedProfile}
                profiles={selectedTool?.profiles || []}
                onProfileChange={(p: AttackProfile) => store.setSelectedProfileId(p.id)}
                onExecute={() => handleExecute()}
                onCancel={handleCancel}
                onOpenNotes={() => store.setModalOpen('notes', true)}
                onOpenEvidence={() => store.setModalOpen('evidence', true)}
                onOpenUploads={() => store.setModalOpen('uploads', true)}
                uploads={store.uploads || []}
                selectedToolCategory={selectedTool?.category}
                autoPilotEnabled={store.autoPilotEnabled}
                onToggleAutoPilot={handleToggleAutoPilot}
              />

              <ResizablePanelGroup direction="vertical" className="flex-1">
                <ResizablePanel defaultSize={40} minSize={20}>
                  <VisualGraph />
                </ResizablePanel>
                
                <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/30 transition-colors" />
                
                <ResizablePanel defaultSize={60} minSize={20} className="bg-[#0a0a0c] flex flex-col">
                  <div className="flex items-center gap-px bg-muted/10 border-b border-border px-2 shrink-0 overflow-x-auto no-scrollbar">
                    {store.terminalSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => store.setActiveTerminalId(session.id)}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-b-2 font-mono text-[10px] uppercase tracking-tighter whitespace-nowrap",
                          store.activeTerminalId === session.id 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-transparent text-muted-foreground hover:bg-muted/5 hover:text-foreground"
                        )}
                      >
                        {session.type === 'system' ? <Shield className="size-3" /> : session.type === 'shell' ? <TerminalIcon className="size-3" /> : <Binary className="size-3" />}
                        {session.title}
                        {session.type !== 'system' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); store.removeTerminalSession(session.id) }}
                            className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary" onClick={() => store.addTerminalSession({ id: `shell-${Date.now()}`, title: `Shell ${store.terminalSessions.length}`, type: 'shell' })}><Plus className="size-3.5" /></Button>
                  </div>

                  <div className="flex-1 relative">
                    {store.terminalSessions.map((session) => (
                      <div key={session.id} className={cn("absolute inset-0", store.activeTerminalId === session.id ? "block" : "hidden")}>
                        {session.type === 'shell' ? (
                           <div className="h-full w-full flex items-center justify-center bg-card/20 text-muted-foreground font-mono text-xs uppercase tracking-widest italic">Interactive Shell Session {session.id.split('-')[1]} Initialized</div>
                        ) : (
                          <TerminalView
                            logs={allLogs[session.id === 'system' ? '' : (session.toolName || '')] || ""}
                            processStatus={statuses[session.toolName || ''] || 'idle'}
                            selectedToolName={session.title}
                            target={store.target}
                            profileName=""
                            onClear={() => setAllLogs((p) => ({ ...p, [session.toolName || '']: "" }))}
                            backendUrl={store.backendUrl}
                            sessionId={store.currentSessionId || 0}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/30 transition-colors" />

          <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
            <TacticalTimeline backendUrl={store.backendUrl} sessionId={store.currentSessionId || 0} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <ParameterPrompt 
        isOpen={paramPrompt.isOpen}
        onClose={() => setParamPrompt(p => ({ ...p, isOpen: false }))}
        title={paramPrompt.title}
        description={paramPrompt.description}
        parameters={paramPrompt.parameters}
        onConfirm={paramPrompt.onConfirm}
      />

      <EvidenceModal isOpen={store.isEvidenceOpen} onClose={() => store.setModalOpen('evidence', false)} backendUrl={store.backendUrl} selectedEvidenceFiles={selectedEvidenceFiles} onToggleEvidenceFile={handleToggleEvidenceFile} />
      <Dialog open={store.isUploadsOpen} onOpenChange={(open) => store.setModalOpen('uploads', open)}><DialogContent showCloseButton={false} className="max-w-3xl h-[60vh] p-0 overflow-hidden bg-background border-border z-[250]"><UploadManager backendUrl={store.backendUrl} uploads={store.uploads || []} onRefresh={fetchUploads} onClose={() => store.setModalOpen('uploads', false)} /></DialogContent></Dialog>
      <HistoryModal isOpen={store.isHistoryOpen} onClose={() => store.setModalOpen('history', false)} backendUrl={store.backendUrl} sessionId={store.currentSessionId || 0} />
      <ReportModal isOpen={store.isReportOpen} onClose={() => store.setModalOpen('report', false)} backendUrl={store.backendUrl} sessionId={store.currentSessionId || 0} />
      <AutomationCenter isOpen={store.isAutomationCenterOpen} onClose={() => store.setModalOpen('automationCenter', false)} backendUrl={store.backendUrl} tools={store.tools || []} />
      <AssetLibrary isOpen={store.isAssetLibraryOpen} onClose={() => store.setModalOpen('assetLibrary', false)} backendUrl={store.backendUrl} />
      <NotesModal isOpen={store.isNotesOpen} onClose={() => store.setModalOpen('notes', false)} backendUrl={store.backendUrl} target={store.target || 'global'} sessionId={store.currentSessionId || 0} />
      <AIConfigModal isOpen={store.isAIConfigOpen} onClose={() => store.setModalOpen('aIConfig', false)} onShowToast={(t, d) => toast({ title: t, description: d })} backendUrl={store.backendUrl} />
      <AIPanel isOpen={store.isAIPanelOpen} onClose={() => store.setModalOpen('aIPanel', false)} onShowToast={(t, d) => toast({ title: t, description: d })} backendUrl={store.backendUrl} sessionId={store.currentSessionId || 0} selectedEvidenceFiles={selectedEvidenceFiles} onToggleEvidenceFile={handleToggleEvidenceFile} />
      <ShellPanel isOpen={store.isShellOpen} onClose={() => store.setModalOpen('shell', false)} backendUrl={store.backendUrl} />
      <Toaster />
    </>
  )
}
