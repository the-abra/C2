'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ConnectionOverlay } from './connection-overlay'
import { Sidebar } from './sidebar'
import { TerminalView } from './terminal-view'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useC2Engine, type ProcessStatus } from '@/hooks/use-c2-engine'
import dynamic from 'next/dynamic'
import { CommandPalette } from './command-palette'
import { useC2Store, type TerminalSession } from '@/hooks/use-c2-store'
import { SessionManager } from './session-manager'
import { TacticalErrorBoundary } from './tactical-error-boundary'
import { ParameterPrompt } from './parameter-prompt'
import { FlagCapture } from './flag-capture'
import {
  Target, Play, XCircle, X, Plus, Terminal as TerminalIcon,
  Binary, Shield, Map, Clock, Flag, ChevronDown, Activity, BookOpen, Zap, Copy, Check
} from 'lucide-react'
import { audioSynth } from '@/lib/audio-synth'
import { cn } from '@/lib/utils'

// Dynamic imports — only load when needed
const VisualGraph = dynamic(() => import('./visual-graph').then(m => m.VisualGraph), { ssr: false })
const ReportModal = dynamic(() => import('./report-modal').then(m => m.ReportModal), { ssr: false })
const EvidenceModal = dynamic(() => import('./evidence-modal').then(m => m.EvidenceModal), { ssr: false })
const HistoryModal = dynamic(() => import('./history-modal').then(m => m.HistoryModal), { ssr: false })
const NotesModal = dynamic(() => import('./notes-modal').then(m => m.NotesModal), { ssr: false })
const UploadManager = dynamic(() => import('./upload-manager').then(m => m.UploadManager), { ssr: false })
const ShellPanel = dynamic(() => import('@/components/c2/shell-panel').then(m => m.ShellPanel), { ssr: false })
const ShellTerminalView = dynamic(() => import('./shell-terminal-view').then(m => m.ShellTerminalView), { ssr: false })
const TacticalMissionStudio = dynamic(() => import('./tactical-mission-studio').then(m => m.TacticalMissionStudio), { ssr: false })
const AssetLibrary = dynamic(() => import('./asset-library').then(m => m.AssetLibrary), { ssr: false })
const TacticalTimeline = dynamic(() => import('./tactical-timeline').then(m => m.TacticalTimeline), { ssr: false })
const SystemMonitor = dynamic(() => import('./system-monitor').then(m => m.SystemMonitor), { ssr: false })
const CTFPlaybook = dynamic(() => import('./ctf-playbook').then(m => m.CTFPlaybook), { ssr: false })
const PayloadArsenal = dynamic(() => import('./payload-arsenal').then(m => m.PayloadArsenal), { ssr: false })

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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
  fetchHistory,
  type Tool,
  type Category,
  type AttackProfile,
  type Discovery,
  type Scenario
} from '@/lib/api-service'

type CenterView = 'terminal' | 'graph' | 'timeline' | 'system' | 'playbook' | 'payloads'

export function Dashboard() {
  const { toast } = useToast()
  const store = useC2Store()
  const [mounted, setMounted] = useState(false)
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<{ target: string; filename: string }[]>([])
  const [flagCaptureOpen, setFlagCaptureOpen] = useState(false)
  const [centerView, setCenterView] = useState<CenterView>('terminal')
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [previewCopied, setPreviewCopied] = useState(false)

  // Listen for flag capture toggle (Ctrl+Shift+F)
  useEffect(() => {
    const handler = () => setFlagCaptureOpen(prev => !prev)
    document.addEventListener('toggle-flag-capture', handler)
    return () => document.removeEventListener('toggle-flag-capture', handler)
  }, [])

  const fetchHistoryData = useCallback(async () => {
    if (!store.backendUrl || !store.currentSessionId) return
    try {
      const history = await fetchHistory(store.backendUrl, store.currentSessionId)
      setScanHistory(history)
    } catch { }
  }, [store.backendUrl, store.currentSessionId])

  useEffect(() => {
    if (store.connected && store.currentSessionId) {
      fetchHistoryData()
    }
  }, [store.connected, store.currentSessionId, fetchHistoryData])

  // Listen for quick-scan from graph/dossier
  useEffect(() => {
    const handleQuickScan = async (e: any) => {
      const { tool: binaryName, target } = e.detail
      if (!binaryName || !target) return

      const tool = store.tools?.find(t => t.default_binary_name.toLowerCase() === binaryName.toLowerCase())
      if (!tool) {
        toast({ title: 'Tool Not Found', description: `Cannot quick-scan with ${binaryName}.`, variant: 'destructive' })
        return
      }

      const profile = tool.profiles?.[0]
      if (!profile) return

      store.setSelectedToolId(tool.id)
      store.setSelectedProfileId(profile.id)
      store.setTarget(target)

      const requiredParams = (profile.args || [])
        .filter((a: string) => a.includes('{{') && !a.includes('{{TARGET}}') && !a.includes('{{target}}') && !a.includes('{{BINARY}}') && !a.includes('{{HOME}}'))
        .map((a: string) => { const m = a.match(/\{\{(\w+)\}\}/); return m ? m[1] : null })
        .filter(Boolean) as string[]

      const executeScan = async (params: Record<string, string> = {}) => {
        try {
          const res = await runTool({
            sessionId: store.currentSessionId || 0,
            toolId: tool.id,
            profileId: profile.id,
            target: target,
            params: params
          }, store.backendUrl)
          store.setScanId(tool.default_binary_name, res.scan_id)
          store.addTerminalSession({ id: tool.default_binary_name, title: tool.name, type: 'tool', toolName: tool.default_binary_name })
          setCenterView('terminal')
          fetchHistoryData()
          toast({ title: 'Quick Scan Engaged', description: `Launched ${tool.name} on ${target}` })
        } catch (err: any) {
          toast({ title: 'Execution Failed', description: err.message, variant: 'destructive' })
        }
      }

      if (requiredParams.length > 0) {
        setParamPrompt({
          isOpen: true,
          title: `${tool.name} — ${profile.name}`,
          description: `Requires additional parameters for quick scan`,
          rationale: (profile as any).rationale,
          params: requiredParams,
          profileArgs: profile.args,
          target: target,
          onSubmit: executeScan
        })
      } else {
        executeScan()
      }
    }

    document.addEventListener('quick-scan', handleQuickScan)
    return () => document.removeEventListener('quick-scan', handleQuickScan)
  }, [store, toast, fetchHistoryData])

  // Parameter Prompt State
  const [paramPrompt, setParamPrompt] = useState<{
    isOpen: boolean,
    title: string,
    description: string,
    rationale?: string,
    params: string[],
    onSubmit: ((values: Record<string, string>) => void) | null,
    profileArgs: string[],
    target: string,
  }>({ isOpen: false, title: '', description: '', rationale: '', params: [], onSubmit: null, profileArgs: [], target: '' })

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (store.connected) {
      const syncFreshState = async () => {
        try {
          const tools = await fetchTools(store.backendUrl)
          store.setTools(tools)
          const cats = tools.reduce((acc: any[], t: any) => {
            const cat = acc.find(c => c.label === t.category)
            if (cat) { cat.tools.push(t) } else { acc.push({ label: t.category, tools: [t] }) }
            return acc
          }, [])
          store.setCategories(cats)
          const scenarios = await fetchScenarios(store.backendUrl)
          store.setScenarios(scenarios || [])

          // Automatically select first profile if current selected tool's profile is null or out of date
          const currentTool = tools.find(t => t.id === store.selectedToolId)
          if (currentTool) {
            if (!store.selectedProfileId || !currentTool.profiles?.some(p => p.id === store.selectedProfileId)) {
              if (currentTool.profiles?.length) {
                store.setSelectedProfileId(currentTool.profiles[0].id)
              }
            }
          } else if (tools.length > 0) {
            // Revert to first tool if selectedToolId is invalid
            store.setSelectedToolId(tools[0].id)
            if (tools[0].profiles?.length) {
              store.setSelectedProfileId(tools[0].profiles[0].id)
            }
          }
        } catch (err) {
          console.error("Mount sync failed:", err)
        }
      }
      syncFreshState()
    }
  }, [store.connected])

  // Memoized selections
  const selectedTool = useMemo(() => {
    if (!store.tools || store.selectedToolId === null || store.selectedToolId === undefined) return undefined
    const searchId = store.selectedToolId.toString()
    return store.tools.find((t: Tool) => t.id.toString() === searchId)
  }, [store.tools, store.selectedToolId])

  const selectedProfile = useMemo(() => {
    if (!selectedTool || store.selectedProfileId === null || store.selectedProfileId === undefined) return undefined
    const searchId = store.selectedProfileId.toString()
    return selectedTool.profiles?.find((p: AttackProfile) => p.id.toString() === searchId)
  }, [selectedTool, store.selectedProfileId])

  const resolvedPreviewCommand = useMemo(() => {
    if (!selectedTool || !selectedProfile) return ''
    return `${selectedTool.default_binary_name} ${selectedProfile.args.map(a => 
      a.includes('{{') && !a.includes('TARGET') && !a.includes('target') 
        ? a 
        : a.replace(/\{\{TARGET\}\}/gi, store.target || 'TARGET').replace(/\{\{target\}\}/gi, store.target || 'TARGET')
    ).join(' ')}`
  }, [selectedTool, selectedProfile, store.target])

  // Engine
  const engineCallbacks = useMemo(() => ({
    onDiscovery: (discovery: Discovery) => {
      store.setDiscoveries([...(store.discoveries || []), discovery])
      audioSynth?.playDiscoveryPing?.()
      if (discovery.type === 'vuln') {
        audioSynth?.playVulnAlarm?.()
        toast({ title: `🔴 VULN: ${discovery.value}`, description: `Source: scan #${discovery.source_scan_id}` })
      }
    },
    onNoteUpdate: (target: string) => {
      store.triggerNoteUpdate()
      toast({ title: `📝 NOTE UPDATED`, description: `Tactical notes for ${target} have been saved.` })
    },
    onHeuristicAdvice: (tool: string, advice: any) => {
      audioSynth?.playDiscoveryPing?.()
      toast({ 
        title: `💡 TACTICAL ADVICE: ${advice.title}`, 
        description: advice.description,
        duration: 10000,
      })
    },
    onStatusChange: (tool: string, status: ProcessStatus) => {
      if (status === 'completed') {
        audioSynth?.playScanSuccess?.()
        toast({ title: `✓ ${tool.toUpperCase()} Complete`, description: 'Scan finished successfully.' })
      }
      fetchHistoryData()
    }
  }), [store.discoveries, toast, fetchHistoryData])

  const { allLogs, setAllLogs, statuses } = useC2Engine(
    store.backendUrl,
    store.connected,
    store.currentSessionId,
    engineCallbacks
  )

  const activeToolStatus = statuses[selectedTool?.default_binary_name || ''] || 'idle'

  // Connection
  const handleConnect = async (url: string) => {
    try {
      await connectToBackend(url)
      store.setBackendUrl(url)
      store.setConnected(true)
      const tools = await fetchTools(url)
      store.setTools(tools)
      const cats = tools.reduce((acc: Category[], t: Tool) => {
        const cat = acc.find(c => c.label === t.category)
        if (cat) { cat.tools.push(t) } else { acc.push({ label: t.category, tools: [t] }) }
        return acc
      }, [])
      store.setCategories(cats)
      const scenarios = await fetchScenarios(url)
      store.setScenarios(scenarios || [])
      if (tools.length > 0) {
        store.setSelectedToolId(tools[0].id)
        if (tools[0].profiles?.length) store.setSelectedProfileId(tools[0].profiles[0].id)
      }
    } catch (e: any) {
      toast({ title: 'Connection Failed', description: e.message, variant: 'destructive' })
    }
  }

  // Execution
  const handleExecute = async () => {
    if (!selectedTool || !selectedProfile || !store.target) return
    const requiredParams = (selectedProfile.args || [])
      .filter((a: string) => a.includes('{{') && !a.includes('{{TARGET}}') && !a.includes('{{target}}') && !a.includes('{{BINARY}}') && !a.includes('{{HOME}}'))
      .map((a: string) => { const m = a.match(/\{\{(\w+)\}\}/); return m ? m[1] : null })
      .filter(Boolean) as string[]

    if (requiredParams.length > 0) {
      setParamPrompt({
        isOpen: true,
        title: `${selectedTool.name} — ${selectedProfile.name}`,
        description: `Requires additional parameters`,
        rationale: selectedProfile.rationale,
        params: requiredParams,
        profileArgs: selectedProfile.args,
        target: store.target,
        onSubmit: async (values) => {
          try {
            const res = await runTool({
              sessionId: store.currentSessionId || 0,
              toolId: selectedTool.id,
              profileId: selectedProfile.id,
              target: store.target,
              params: values
            }, store.backendUrl)
            store.setScanId(selectedTool.default_binary_name, res.scan_id)
            store.addTerminalSession({ id: selectedTool.default_binary_name, title: selectedTool.name, type: 'tool', toolName: selectedTool.default_binary_name })
            setCenterView('terminal')
            fetchHistoryData()
          } catch (e: any) { toast({ title: 'Execution Failed', description: e.message, variant: 'destructive' }) }
        }
      })
      return
    }

    try {
      const res = await runTool({
        sessionId: store.currentSessionId || 0,
        toolId: selectedTool.id,
        profileId: selectedProfile.id,
        target: store.target
      }, store.backendUrl)
      store.setScanId(selectedTool.default_binary_name, res.scan_id)
      store.addTerminalSession({ id: selectedTool.default_binary_name, title: selectedTool.name, type: 'tool', toolName: selectedTool.default_binary_name })
      setCenterView('terminal')
      fetchHistoryData()
    } catch (e: any) { toast({ title: 'Execution Failed', description: e.message, variant: 'destructive' }) }
  }

  const handleCancel = async () => {
    if (!selectedTool) return
    const scanId = store.scanIds[selectedTool.default_binary_name]
    if (scanId) {
      try { await killScan(scanId, store.backendUrl) } catch { }
    }
  }

  const handleToggleAutoPilot = async (enabled: boolean) => {
    try {
      await toggleAutomation(enabled, store.backendUrl)
      store.setAutoPilotEnabled(enabled)
    } catch { }
  }

  const handleToggleEvidenceFile = (target: string, filename: string) => {
    setSelectedEvidenceFiles(prev =>
      prev.some(f => f.filename === filename)
        ? prev.filter(f => f.filename !== filename)
        : [...prev, { target, filename }]
    )
  }

  const fetchUploads = async () => {
    try {
      const res = await fetch(`${store.backendUrl}/api/uploads`)
      if (res.ok) { store.setUploads(await res.json()) }
    } catch { }
  }

  const handleRunScenario = async () => {
    if (!store.selectedScenarioId || !store.target) return
    try {
      await runScenario(store.backendUrl, store.currentSessionId || 0, store.selectedScenarioId, store.target)
      const scenario = store.scenarios.find(s => s.id === store.selectedScenarioId)
      toast({ title: "Scenario Engaged", description: `Mission '${scenario?.name}' is now active.` })
      fetchHistoryData()
    } catch (e: any) {
      toast({ title: "Engagement Failed", description: e.message, variant: "destructive" })
    }
  }

  if (!mounted) return null

  const selectedScenario = store.scenarios?.find((s: Scenario) => s.id === store.selectedScenarioId)

  return (
    <>
      <CommandPalette />
      {!store.connected && <ConnectionOverlay onConnect={handleConnect} />}
      {store.connected && !store.currentSessionId && <SessionManager />}

      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">

        {/* ━━━ LEFT: Sidebar ━━━ */}
        <div className="w-80 shrink-0 border-r border-border">
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
            onOpenShell={() => store.setModalOpen('shell', true)}
            onOpenHistory={() => store.setModalOpen('history', true)}
            onOpenReport={() => store.setModalOpen('report', true)}
            selectedEvidenceCount={selectedEvidenceFiles.length}
          />
        </div>

        {/* ━━━ CENTER: Everything else ━━━ */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* ── Top Bar: Target + Profile + Execute (one clean row) ── */}
          <div className="h-14 border-b border-border bg-card/50 flex items-center gap-3 px-4 shrink-0">

            {/* Target Input */}
            <div className="relative flex-1 max-w-md">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-primary/50" />
              <Input
                value={store.target || ''}
                onChange={(e) => store.setTarget(e.target.value)}
                placeholder="Target IP / Domain / URL"
                className="h-9 pl-9 pr-8 font-mono text-xs bg-muted/10 border-border uppercase placeholder:normal-case placeholder:opacity-30"
              />
              {store.target && (
                <button onClick={() => store.setTarget('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <XCircle className="size-3.5" />
                </button>
              )}
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-border" />

            {/* Profile Selector OR Scenario Label */}
            {store.selectedScenarioId ? (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold text-primary uppercase">Scenario:</span>
                <span className="text-xs font-mono font-bold uppercase truncate max-w-[140px]">{selectedScenario?.name}</span>
              </div>
            ) : (
              <Select
                value={selectedProfile?.id?.toString() || ''}
                onValueChange={(v) => {
                  const p = selectedTool?.profiles?.find((p: AttackProfile) => p.id.toString() === v)
                  if (p) store.setSelectedProfileId(p.id)
                }}
              >
                <SelectTrigger className="w-44 h-9 bg-muted/10 border-border text-[10px] font-mono uppercase">
                  <SelectValue placeholder="Profile" />
                </SelectTrigger>
                <SelectContent className="font-mono text-xs">
                  {(selectedTool?.profiles || []).map((p: AttackProfile) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Execute / Abort */}
            {activeToolStatus === 'running' ? (
              <Button variant="destructive" onClick={handleCancel} className="h-9 px-4 font-mono text-xs font-bold uppercase">
                <XCircle className="size-3.5 mr-1.5" /> Abort
              </Button>
            ) : (
              <Button
                onClick={store.selectedScenarioId ? handleRunScenario : handleExecute}
                disabled={!store.target?.trim() || (!selectedProfile && !store.selectedScenarioId)}
                className="h-9 px-5 font-mono text-xs font-black uppercase bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
              >
                <Play className="size-3.5 mr-1.5 fill-current" /> Engage
              </Button>
            )}

            {/* Right: Flag + View Switcher */}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => document.dispatchEvent(new CustomEvent('toggle-flag-capture'))}
                className="p-2 rounded-md text-green-500/60 hover:text-green-500 hover:bg-green-500/10 transition-colors"
                title="Flag Vault (Ctrl+Shift+F)"
              >
                <Flag className="size-4" />
              </button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* View Switcher Tabs */}
              <div className="flex items-center bg-muted/10 rounded-md border border-border p-0.5 gap-0.5">
                {([
                  { id: 'terminal' as CenterView, icon: TerminalIcon, label: 'Terminal' },
                  { id: 'graph' as CenterView, icon: Map, label: 'Graph' },
                  { id: 'timeline' as CenterView, icon: Clock, label: 'Timeline' },
                  { id: 'system' as CenterView, icon: Activity, label: 'System' },
                  { id: 'playbook' as CenterView, icon: BookOpen, label: 'Playbook' },
                  { id: 'payloads' as CenterView, icon: Zap, label: 'Payloads' },
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setCenterView(id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide transition-all",
                      centerView === id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title={label}
                  >
                    <Icon className="size-3" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Command Pre-flight Preview Strip ── */}
          {selectedTool && selectedProfile && !store.selectedScenarioId && (
            <div className="h-9 border-b border-border bg-[#08080a] flex items-center px-4 shrink-0 justify-between text-[10px] font-mono tracking-wide text-muted-foreground select-none">
              <div className="flex items-center gap-2 truncate max-w-[70%] select-all">
                <span className="text-[8px] font-black uppercase text-accent bg-accent/10 border border-accent/25 px-1.5 py-0.5 rounded tracking-widest shrink-0">Pre-flight CLI</span>
                <span className="text-foreground/90 font-mono font-bold truncate">
                  {resolvedPreviewCommand}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resolvedPreviewCommand)
                    setPreviewCopied(true)
                    setTimeout(() => setPreviewCopied(false), 2000)
                    toast({ title: "Command Copied", description: "Resolved binary invocation is now on your clipboard." })
                  }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/10 border border-border/50 hover:bg-muted/20 text-[8px] font-bold uppercase transition-all text-foreground shrink-0"
                >
                  {previewCopied ? (
                    <>
                      <Check className="size-2.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-2.5 text-muted-foreground" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Main Content Area ── */}
          <div className="flex-1 min-h-0 relative">

            {/* Terminal View */}
            <div className={cn("absolute inset-0 flex flex-col", centerView !== 'terminal' && "hidden")}>
              {/* Terminal Tab Bar */}
              <div className="flex items-center gap-px bg-muted/10 border-b border-border px-2 shrink-0 overflow-x-auto no-scrollbar">
                {store.terminalSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => store.setActiveTerminalId(session.id)}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-b-2 font-mono text-[10px] uppercase tracking-tighter whitespace-nowrap",
                      store.activeTerminalId === session.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
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

              {/* Terminal Content */}
              <div className="flex-1 relative bg-[#0a0a0c]">
                {store.terminalSessions.map((session) => (
                  <div key={session.id} className={cn("absolute inset-0", store.activeTerminalId === session.id ? "block" : "hidden")}>
                    {session.type === 'shell' ? (
                      <ShellTerminalView
                        backendUrl={store.backendUrl}
                        sessionId={session.id}
                        isActive={store.activeTerminalId === session.id}
                      />
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
            </div>

            {/* Graph View */}
            <div className={cn("absolute inset-0", centerView !== 'graph' && "hidden")}>
              <TacticalErrorBoundary fallbackTitle="Graph Render Fault">
                <VisualGraph />
              </TacticalErrorBoundary>
            </div>

            {/* Timeline View */}
            <div className={cn("absolute inset-0", centerView !== 'timeline' && "hidden")}>
              <TacticalErrorBoundary fallbackTitle="Timeline Render Fault">
                <TacticalTimeline backendUrl={store.backendUrl} sessionId={store.currentSessionId || 0} />
              </TacticalErrorBoundary>
            </div>

            {/* System Monitor View */}
            <div className={cn("absolute inset-0", centerView !== 'system' && "hidden")}>
              <TacticalErrorBoundary fallbackTitle="System Monitor Render Fault">
                <SystemMonitor backendUrl={store.backendUrl} />
              </TacticalErrorBoundary>
            </div>

            {/* CTF Playbook View */}
            <div className={cn("absolute inset-0", centerView !== 'playbook' && "hidden")}>
              <TacticalErrorBoundary fallbackTitle="Playbook Render Fault">
                <CTFPlaybook target={store.target || undefined} scanHistory={scanHistory} />
              </TacticalErrorBoundary>
            </div>

            {/* Payload Arsenal View */}
            <div className={cn("absolute inset-0", centerView !== 'payloads' && "hidden")}>
              <TacticalErrorBoundary fallbackTitle="Arsenal Render Fault">
                <PayloadArsenal target={store.target || undefined} />
              </TacticalErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ Modals (loaded on demand) ━━━ */}
      <ParameterPrompt
        isOpen={paramPrompt.isOpen}
        onClose={() => setParamPrompt(p => ({ ...p, isOpen: false }))}
        title={paramPrompt.title}
        description={paramPrompt.description}
        rationale={paramPrompt.rationale}
        parameters={paramPrompt.params}
        onConfirm={(values) => { paramPrompt.onSubmit?.(values); setParamPrompt(p => ({ ...p, isOpen: false })) }}
        profileArgs={paramPrompt.profileArgs}
        target={paramPrompt.target}
      />

      <EvidenceModal isOpen={store.isEvidenceOpen} onClose={() => store.setModalOpen('evidence', false)} backendUrl={store.backendUrl} selectedEvidenceFiles={selectedEvidenceFiles} onToggleEvidenceFile={handleToggleEvidenceFile} />
      <Dialog open={store.isUploadsOpen} onOpenChange={(open) => store.setModalOpen('uploads', open)}><DialogContent showCloseButton={false} className="max-w-3xl h-[60vh] p-0 overflow-hidden bg-background border-border z-[250]"><UploadManager backendUrl={store.backendUrl} uploads={store.uploads || []} onRefresh={fetchUploads} onClose={() => store.setModalOpen('uploads', false)} /></DialogContent></Dialog>
      <HistoryModal isOpen={store.isHistoryOpen} onClose={() => store.setModalOpen('history', false)} backendUrl={store.backendUrl} sessionId={store.currentSessionId || 0} />
      <ReportModal isOpen={store.isReportOpen} onClose={() => store.setModalOpen('report', false)} backendUrl={store.backendUrl} sessionId={store.currentSessionId || 0} />
      <AssetLibrary isOpen={store.isAssetLibraryOpen} onClose={() => store.setModalOpen('assetLibrary', false)} backendUrl={store.backendUrl} />
      <NotesModal isOpen={store.isNotesOpen} onClose={() => store.setModalOpen('notes', false)} backendUrl={store.backendUrl} target={store.target || 'global'} sessionId={store.currentSessionId || 0} />
      <ShellPanel isOpen={store.isShellOpen} onClose={() => store.setModalOpen('shell', false)} backendUrl={store.backendUrl} />
      <TacticalMissionStudio isOpen={!!store.isMissionStudioOpen} onClose={() => store.setModalOpen('missionStudio', false)} backendUrl={store.backendUrl} />
      <FlagCapture isOpen={flagCaptureOpen} onClose={() => setFlagCaptureOpen(false)} />
      <Toaster />
    </>
  )
}
