'use client'

import { useState } from 'react'
import { 
  X, Shield, Play, Loader2, Info, Plus, Trash2, ArrowRight, Zap, Target, Database, FileText, CheckCircle2, AlertTriangle, Code, RefreshCw, Clock, Terminal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useC2Store } from '@/hooks/use-c2-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface TacticalMissionStudioProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
}

export function TacticalMissionStudio({ isOpen, onClose, backendUrl }: TacticalMissionStudioProps) {
  const store = useC2Store()
  const [activeTab, setActiveTab] = useState<'tools' | 'scenarios' | 'batch'>('tools')

  // --- TAB 1: Visual Tool Configurator & Regex Tester States ---
  const [toolName, setToolName] = useState('')
  const [toolBinary, setToolBinary] = useState('')
  const [toolCategory, setToolCategory] = useState('Reconnaissance')
  const [toolDesc, setToolDesc] = useState('')
  const [profileName, setProfileName] = useState('Default Attack')
  const [profileArgs, setProfileArgs] = useState('{{TARGET}}')
  const [regexType, setRegexType] = useState<'vuln' | 'service' | 'domain' | 'ip'>('vuln')
  const [regexString, setRegexString] = useState('')
  const [sampleLogs, setSampleLogs] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; matches: string[] | null; msg: string }>({ success: false, matches: null, msg: '' })

  const handleTestRegex = () => {
    if (!regexString.trim()) {
      setTestResult({ success: false, matches: null, msg: 'Please provide a regular expression.' })
      return
    }
    if (!sampleLogs.trim()) {
      setTestResult({ success: false, matches: null, msg: 'Please paste simulated terminal log output to test.' })
      return
    }

    try {
      const reg = new RegExp(regexString)
      const lines = sampleLogs.split('\n')
      const allMatches: string[] = []
      
      lines.forEach(line => {
        const match = line.match(reg)
        if (match) {
          // If there's a capture group, take the first group, else take full match
          allMatches.push(match[1] || match[0])
        }
      })

      if (allMatches.length > 0) {
        setTestResult({
          success: true,
          matches: allMatches,
          msg: `SUCCESS: Found ${allMatches.length} parsed discoveries mapped to target type [${regexType.toUpperCase()}].`
        })
      } else {
        setTestResult({
          success: false,
          matches: null,
          msg: 'FAILED: No matches found. Adjust your regular expression or test log lines.'
        })
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        matches: null,
        msg: `REGEX ERROR: ${err.message}`
      })
    }
  }

  const handlePublishTool = () => {
    if (!toolName.trim() || !toolBinary.trim()) {
      alert('Please fill out Tool Name and Binary executable name.')
      return
    }

    const newToolId = Math.floor(Math.random() * 100000)
    const newTool = {
      id: newToolId,
      name: toolName,
      category: toolCategory,
      description: toolDesc || 'Custom configured operational tool.',
      default_binary_name: toolBinary,
      is_installed: true,
      profiles: [
        {
          id: Math.floor(Math.random() * 100000),
          tool_id: newToolId,
          name: profileName,
          args: profileArgs.split(/\s+/)
        }
      ]
    }

    const updatedTools = [...(store.tools || []), newTool]
    store.setTools(updatedTools)

    // Recompute categories
    const cats: Record<string, any[]> = {}
    updatedTools.forEach(t => {
      if (t && t.category) {
        if (!cats[t.category]) cats[t.category] = []
        cats[t.category].push(t)
      }
    })
    store.setCategories(Object.entries(cats).map(([label, tools]) => ({ label, tools })))

    // Save to server
    fetch(`${backendUrl}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: store.currentSessionId,
        action: 'register_tool',
        tool: newTool,
        parser: { type: regexType, regex: regexString }
      })
    }).catch(() => {})

    alert(`Successfully registered custom tool: ${toolName}! It has been added to your Arsenal in the sidebar.`)
    
    // Reset fields
    setToolName('')
    setToolBinary('')
    setToolDesc('')
    setRegexString('')
    setSampleLogs('')
    setTestResult({ success: false, matches: null, msg: '' })
  }

  // --- TAB 2: Scenario Scenario Builder States ---
  const [scenarioName, setScenarioName] = useState('')
  const [scenarioDesc, setScenarioDesc] = useState('')
  const [scenarioSteps, setScenarioSteps] = useState<{ toolId: number; profileId: number; wait: boolean; propagate: boolean }[]>([])

  const handleAddStep = () => {
    if ((store.tools || []).length === 0) return
    const firstTool = store.tools[0]
    const firstProfileId = firstTool.profiles?.[0]?.id || 0
    setScenarioSteps(prev => [...prev, { toolId: firstTool.id, profileId: firstProfileId, wait: true, propagate: true }])
  }

  const handleUpdateStep = (idx: number, key: string, val: any) => {
    setScenarioSteps(prev => prev.map((s, sIdx) => {
      if (sIdx !== idx) return s
      const updated = { ...s, [key]: val }
      // If tool changed, reset profileId to first profile of new tool
      if (key === 'toolId') {
        const tool = store.tools.find(t => t.id === val)
        updated.profileId = tool?.profiles?.[0]?.id || 0
      }
      return updated
    }))
  }

  const handleRemoveStep = (idx: number) => {
    setScenarioSteps(prev => prev.filter((_, sIdx) => sIdx !== idx))
  }

  const handlePublishScenario = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a Scenario Name.')
      return
    }
    if (scenarioSteps.length === 0) {
      alert('Please add at least one execution step to the pipeline.')
      return
    }

    const steps = scenarioSteps.map((s, sIdx) => {
      const tool = store.tools.find(t => t.id === s.toolId)
      const profile = tool?.profiles?.find(p => p.id === s.profileId)
      return {
        id: Math.floor(Math.random() * 100000),
        scenario_id: 999,
        order_index: sIdx + 1,
        tool_id: s.toolId,
        tool_name: tool?.default_binary_name,
        profile_id: s.profileId,
        profile_name: profile?.name || 'Attack Profile',
        wait_for_previous: s.wait,
        auto_propagate_targets: s.propagate
      }
    })

    const newScenario = {
      id: 0,
      name: scenarioName,
      description: scenarioDesc || 'Custom orchestrator pipeline.',
      category: 'Custom',
      steps: steps
    }
    
    // Save scenario to backend
    fetch(`${backendUrl}/api/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newScenario)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save scenario to backend database')
        return res.json()
      })
      .then((savedScenario) => {
        store.setScenarios([...(store.scenarios || []), savedScenario])
        alert(`Mission Pipeline Compiled & Published! You can now select "${scenarioName}" under your Missions sidebar!`)
        setScenarioName('')
        setScenarioDesc('')
        setScenarioSteps([])
      })
      .catch(err => {
        console.error(err)
        alert('Error saving custom scenario: ' + err.message)
      })
  }

  // --- TAB 3: Batch Scoping Target Manager ---
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])
  const [batchToolId, setBatchToolId] = useState<number | null>(null)
  const [batchLogs, setBatchLogs] = useState<{ target: string; log: string; status: 'idle' | 'running' | 'completed' }[]>([])

  const handleToggleTarget = (val: string) => {
    setSelectedTargets(prev => 
      prev.includes(val) ? prev.filter(t => t !== val) : [...prev, val]
    )
  }

  const handleSelectAllTargets = () => {
    const list = store.discoveries.filter(d => d.type === 'domain' || d.type === 'ip').map(d => d.value)
    if (selectedTargets.length === list.length) {
      setSelectedTargets([])
    } else {
      setSelectedTargets(list)
    }
  }

  const handleLaunchBatch = () => {
    if (selectedTargets.length === 0) {
      alert('Please select at least one scope target.')
      return
    }
    if (!batchToolId) {
      alert('Please choose a tool for batch execution.')
      return
    }

    const tool = store.tools.find(t => t.id === batchToolId)
    if (!tool) return

    // Initialize mock parallel scan logs
    const initialLogs = selectedTargets.map(target => ({
      target,
      status: 'running' as const,
      log: `[SYS] Spawning isolated sandboxed PTY for target: ${target}\n[SYS] Executing binary: ${tool.default_binary_name} on target scope...\n`
    }))
    setBatchLogs(initialLogs)

    // Simulate parallel CTF execution output streams
    selectedTargets.forEach((target, index) => {
      let step = 0
      const interval = setInterval(() => {
        setBatchLogs(prev => prev.map(item => {
          if (item.target !== target) return item
          let add = ''
          if (step === 0) add = `[+] PTY successfully established. Binding WebSocket...\n`
          else if (step === 1) add = `[*] Launching reconnaissance profile flags against target: ${target}\n`
          else if (step === 2) add = `[RAW] Parsing output patterns in real-time...\n`
          else if (step === 3) add = `[+] Extraction Parser match: Registered Host Discovery inside SQLite.\n`
          else if (step === 4) {
            clearInterval(interval)
            return {
              ...item,
              status: 'completed',
              log: item.log + `[+] Batch thread execution on target ${target} completed successfully.\n[SYS] Process exited with status 0.`
            }
          }
          return {
            ...item,
            log: item.log + add
          }
        }))
        step++
      }, 1500)
    })
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[85vh] flex flex-col bg-background/95 backdrop-blur-md border border-border text-foreground p-0 overflow-hidden z-[200]">
        
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border/80 bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
               <Shield className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black font-mono uppercase tracking-tighter">Tactical Mission Studio</DialogTitle>
              <DialogDescription className="text-[10px] font-mono uppercase tracking-widest opacity-60">Real-time CTF Custom Architect & Orchestrator</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Controls */}
        <div className="flex px-6 bg-muted/5 border-b border-border shrink-0">
          {[
            { id: 'tools', label: 'Arsenal Architect', desc: 'Custom Tools & Parsers' },
            { id: 'scenarios', label: 'Pipeline Studio', desc: 'Mission Sequence Builder' },
            { id: 'batch', label: 'Batch Scoper', desc: 'Parallel Target Scoping' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-5 py-3 border-b-2 font-mono text-left transition-all relative",
                activeTab === tab.id 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/5"
              )}
            >
              <div className="text-xs font-black uppercase tracking-tight">{tab.label}</div>
              <div className="text-[8px] opacity-40 uppercase tracking-tighter mt-0.5">{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          
          {/* TAB 1: TOOL ARCHITECT */}
          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                
                {/* Form fields */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-primary border-b border-border pb-1">Configure Tool Parameters</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Tool Name</label>
                      <Input value={toolName} onChange={e => setToolName(e.target.value)} placeholder="e.g. XSStrike" className="h-9 font-mono text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Binary Name</label>
                      <Input value={toolBinary} onChange={e => setToolBinary(e.target.value)} placeholder="e.g. xsstrike" className="h-9 font-mono text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Category Stage</label>
                    <select
                      value={toolCategory}
                      onChange={e => setToolCategory(e.target.value)}
                      className="w-full h-9 px-3 font-mono text-xs bg-muted/10 border border-border rounded focus:outline-none focus:border-primary/40 text-foreground"
                    >
                      <option value="Reconnaissance">Reconnaissance</option>
                      <option value="Web Vulnerability">Web Vulnerability</option>
                      <option value="Exploitation">Exploitation</option>
                      <option value="PostExploitation">PostExploitation</option>
                      <option value="Forensics">Forensics</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Description</label>
                    <Input value={toolDesc} onChange={e => setToolDesc(e.target.value)} placeholder="e.g. Fast Cross Site Scripting Suite" className="h-9 font-mono text-xs" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Default Profile Name</label>
                      <Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="e.g. Crawl & Scan" className="h-9 font-mono text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Default Arguments</label>
                      <Input value={profileArgs} onChange={e => setProfileArgs(e.target.value)} placeholder="e.g. -u {{TARGET}} --crawl" className="h-9 font-mono text-xs" />
                    </div>
                  </div>
                </div>

                {/* Regex Parser Tester */}
                <div className="space-y-4 bg-muted/5 border border-border/60 p-4 rounded-lg">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-accent border-b border-border pb-1 flex items-center gap-1.5">
                    <Code className="size-3.5" />
                    Regex Parser & Extractor Tester
                  </h3>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Extraction Regular Expression</label>
                      <Input value={regexString} onChange={e => setRegexString(e.target.value)} placeholder="e.g. Vulnerable Parameter:\s*([a-zA-Z0-9_\-]+)" className="h-8 font-mono text-[10px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Discovery Type</label>
                      <select
                        value={regexType}
                        onChange={e => setRegexType(e.target.value as any)}
                        className="w-full h-8 px-2 font-mono text-[10px] bg-muted/10 border border-border rounded focus:outline-none focus:border-primary/40 text-foreground"
                      >
                        <option value="vuln">Vulnerability</option>
                        <option value="service">Service</option>
                        <option value="domain">Domain</option>
                        <option value="ip">IP</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Pasted Simulated Terminal Logs</label>
                      <button
                        type="button"
                        onClick={() => setSampleLogs("[+] Crawling target URL...\n[+] Vulnerable Parameter: pageId\n[+] Vulnerable Parameter: querySearch\n[*] Target scan completed.")}
                        className="text-[8px] font-mono text-primary/70 hover:underline uppercase"
                      >
                        Load Sample Logs
                      </button>
                    </div>
                    <textarea
                      value={sampleLogs}
                      onChange={e => setSampleLogs(e.target.value)}
                      placeholder="Paste terminal log output to test regex matches here..."
                      className="w-full h-24 p-2 font-mono text-[10px] bg-black/80 border border-border rounded text-foreground focus:outline-none focus:border-primary/40"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-8 font-mono text-[10px] uppercase" onClick={handleTestRegex}>
                      Test Extraction Regex
                    </Button>
                    <Button className="flex-1 h-8 font-mono text-[10px] uppercase bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handlePublishTool}>
                      Publish to Arsenal
                    </Button>
                  </div>

                  {testResult.msg && (
                    <div className={cn(
                      "p-3 rounded font-mono text-[9px] border",
                      testResult.success 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-destructive/10 border-destructive/20 text-destructive-foreground"
                    )}>
                      <div className="font-bold mb-1">{testResult.msg}</div>
                      {testResult.matches && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {testResult.matches.map((m, mIdx) => (
                            <span key={mIdx} className="px-1.5 py-0.5 rounded bg-black/40 border border-border text-foreground">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: PIPELINE BUILDER */}
          {activeTab === 'scenarios' && (
            <div className="space-y-6">
              
              {/* Scenario Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Scenario (Mission) Name</label>
                  <Input value={scenarioName} onChange={e => setScenarioName(e.target.value)} placeholder="e.g. SQL Injection Exploitation Loop" className="h-9 font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Mission Objective Description</label>
                  <Input value={scenarioDesc} onChange={e => setScenarioDesc(e.target.value)} placeholder="e.g. Automatically scan crawled URLs with sqlmap and extract databases." className="h-9 font-mono text-xs" />
                </div>
              </div>

              {/* Steps Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-primary">Mission Steps Sequence</h3>
                  <Button variant="outline" size="sm" className="h-8 font-mono text-[10px] uppercase gap-1.5 border-primary/30 hover:bg-primary/5" onClick={handleAddStep}>
                    <Plus className="size-3.5" /> Add Pipeline Stage
                  </Button>
                </div>

                {scenarioSteps.length === 0 ? (
                  <div className="h-48 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-center bg-muted/5">
                    <Zap className="size-8 text-muted-foreground/30 animate-pulse" />
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-8">No steps added to the pipeline. Click Add Pipeline Stage to start chaining tools.</p>
                  </div>
                ) : (
                  <div className="space-y-3 relative">
                    {scenarioSteps.map((step, idx) => {
                      const tool = store.tools.find(t => t.id === step.toolId)
                      
                      return (
                        <div key={idx} className="flex items-center gap-4 bg-muted/5 border border-border p-4 rounded-lg relative group/step animate-in slide-in-from-top-1 duration-200">
                          
                          {/* Order index badge */}
                          <div className="size-6 rounded-full bg-primary flex items-center justify-center font-mono font-bold text-xs text-primary-foreground shadow-sm shadow-primary/25 shrink-0">
                            {idx + 1}
                          </div>

                          {/* Tool select */}
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black font-mono text-muted-foreground uppercase">Choose Tool</label>
                              <select
                                value={step.toolId}
                                onChange={e => handleUpdateStep(idx, 'toolId', Number(e.target.value))}
                                className="w-full h-8 px-2 font-mono text-[10px] bg-muted/10 border border-border rounded focus:outline-none focus:border-primary/40 text-foreground"
                              >
                                {store.tools.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] font-black font-mono text-muted-foreground uppercase">Choose Profile</label>
                              <select
                                value={step.profileId}
                                onChange={e => handleUpdateStep(idx, 'profileId', Number(e.target.value))}
                                className="w-full h-8 px-2 font-mono text-[10px] bg-muted/10 border border-border rounded focus:outline-none focus:border-primary/40 text-foreground"
                              >
                                {tool?.profiles?.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Propagation options */}
                          <div className="flex gap-4 items-center mt-3.5 shrink-0 font-mono text-[9px]">
                            <label className="flex items-center gap-1.5 cursor-pointer uppercase text-muted-foreground hover:text-foreground">
                              <input
                                type="checkbox"
                                checked={step.wait}
                                onChange={e => handleUpdateStep(idx, 'wait', e.target.checked)}
                                className="rounded border-border text-primary accent-primary size-3.5 cursor-pointer"
                              />
                              Sync Wait
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer uppercase text-muted-foreground hover:text-foreground">
                              <input
                                type="checkbox"
                                checked={step.propagate}
                                onChange={e => handleUpdateStep(idx, 'propagate', e.target.checked)}
                                className="rounded border-border text-primary accent-primary size-3.5 cursor-pointer"
                              />
                              Propagate Target
                            </label>
                          </div>

                          {/* Delete step */}
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(idx)}
                            className="size-8 rounded border border-border/80 hover:border-destructive hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all shrink-0 mt-3.5"
                          >
                            <Trash2 className="size-3.5" />
                          </button>

                          {/* Target flow indicator arrow */}
                          {idx < scenarioSteps.length - 1 && (
                            <div className="absolute left-[20px] bottom-[-24px] z-10 flex flex-col items-center pointer-events-none">
                              <div className="w-px h-6 bg-border" />
                              <ArrowRight className="size-3 text-muted-foreground/30 rotate-90 -mt-1" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {scenarioSteps.length > 0 && (
                <div className="flex justify-end pt-4 border-t border-border mt-6">
                  <Button className="font-mono font-black text-xs uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg px-6 h-10" onClick={handlePublishScenario}>
                    Compile & Publish Scenario
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BATCH SCOPING */}
          {activeTab === 'batch' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6 min-h-[400px]">
                
                {/* Target Scope list */}
                <div className="border border-border/60 rounded-lg p-4 bg-muted/5 flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-border pb-2 mb-3 shrink-0">
                    <h3 className="text-xs font-black font-mono uppercase tracking-wider text-primary">Session Discoveries</h3>
                    <button
                      type="button"
                      onClick={handleSelectAllTargets}
                      className="text-[9px] font-mono text-primary/70 hover:underline uppercase"
                    >
                      {selectedTargets.length === store.discoveries.filter(d => d.type === 'domain' || d.type === 'ip').length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                    {store.discoveries.filter(d => d.type === 'domain' || d.type === 'ip').length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-muted-foreground/45">
                        <Clock className="size-6 opacity-30" />
                        <span className="text-[8px] font-mono uppercase tracking-widest">No target scopes detected yet.</span>
                      </div>
                    ) : (
                      store.discoveries.filter(d => d.type === 'domain' || d.type === 'ip').map(disc => (
                        <label
                          key={disc.id}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 border rounded font-mono text-[10px] cursor-pointer transition-all",
                            selectedTargets.includes(disc.value)
                              ? "bg-primary/5 border-primary/30 text-foreground"
                              : "border-border/60 hover:bg-muted/5 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTargets.includes(disc.value)}
                            onChange={() => handleToggleTarget(disc.value)}
                            className="rounded border-border text-primary accent-primary size-3.5 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-bold uppercase">{disc.value}</div>
                            <div className="text-[7px] opacity-40 uppercase mt-0.5">{disc.type} • Found: {new Date(disc.created_at).toLocaleTimeString()}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Batch Config & Parallel view */}
                <div className="col-span-2 flex flex-col h-full space-y-4">
                  
                  {/* Select tool */}
                  <div className="bg-muted/5 border border-border/80 p-4 rounded-lg grid grid-cols-3 gap-4 items-end shrink-0">
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[9px] font-black font-mono text-muted-foreground uppercase">Choose Batch Reconnaissance Tool</label>
                      <select
                        value={batchToolId || ''}
                        onChange={e => setBatchToolId(Number(e.target.value))}
                        className="w-full h-9 px-3 font-mono text-xs bg-muted/10 border border-border rounded focus:outline-none focus:border-primary/40 text-foreground"
                      >
                        <option value="" disabled>SELECT BATCH TOOL</option>
                        {store.tools.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                        ))}
                      </select>
                    </div>

                    <Button className="w-full h-9 font-mono text-xs uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" onClick={handleLaunchBatch}>
                      Engage Parallel Scopes
                    </Button>
                  </div>

                  {/* Parallel Console HUD streams */}
                  <div className="flex-1 border border-border/60 rounded-lg bg-black/90 p-4 font-mono text-[9px] min-h-0 overflow-y-auto flex flex-col">
                    <div className="flex items-center gap-2 border-b border-border/30 pb-2 mb-3 shrink-0">
                      <Terminal className="size-3.5 text-accent animate-pulse" />
                      <span className="text-[9px] text-accent font-black uppercase tracking-wider">Parallel Scopes Process HUD Monitor</span>
                    </div>

                    {batchLogs.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground/30">
                        <Loader2 className="size-6 animate-spin opacity-30" />
                        <span className="text-[8px] uppercase tracking-widest">Awaiting parallel engagement launch...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                        {batchLogs.map(item => (
                          <div key={item.target} className="flex flex-col border border-border/40 bg-black/40 rounded p-3 min-h-0">
                            
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border/20 pb-1.5 mb-2 shrink-0">
                              <span className="text-[9px] font-bold text-foreground uppercase truncate max-w-[120px]">{item.target}</span>
                              <div className="flex items-center gap-1.5">
                                {item.status === 'running' ? (
                                  <>
                                    <Loader2 className="size-2.5 text-primary animate-spin" />
                                    <span className="text-[7px] text-primary uppercase font-bold">RUNNING</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-2.5 text-emerald-400" />
                                    <span className="text-[7px] text-emerald-400 uppercase font-bold">COMPLETED</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Logs content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[8px] leading-relaxed text-muted-foreground/90 select-all whitespace-pre-wrap min-h-0 pr-1">
                              {item.log}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>

      </DialogContent>
    </Dialog>
  )
}
