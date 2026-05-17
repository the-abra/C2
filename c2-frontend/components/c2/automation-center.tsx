'use client'

import { useState, useEffect } from 'react'
import { 
  Zap, Plus, Trash2, Shield, Target, Play, Pause, 
  Settings, Loader2, X, ChevronRight, Binary, Fingerprint 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Rule {
  id: number
  name: string
  trigger_type: 'domain' | 'ip' | 'service' | 'vuln'
  trigger_pattern: string
  tool_id: number
  profile_id: number
  is_enabled: boolean
}

interface AutomationCenterProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
  tools: any[]
}

export function AutomationCenter({ isOpen, onClose, backendUrl, tools }: AutomationCenterProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Form State
  const [newName, setNewName] = useState('')
  const [newTriggerType, setNewTriggerType] = useState<Rule['trigger_type']>('domain')
  const [newPattern, setNewPattern] = useState('')
  const [newToolId, setNewToolId] = useState<string>('')
  const [newProfileId, setNewProfileId] = useState<string>('')

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/api/automation/rules`)
      if (res.ok) {
        const data = await res.json()
        setRules(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchRules()
  }, [isOpen, backendUrl])

  const handleCreate = async () => {
    if (!newName || !newToolId || !newProfileId) return
    setCreating(true)
    try {
      const res = await fetch(`${backendUrl}/api/automation/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          trigger_type: newTriggerType,
          trigger_pattern: newPattern,
          tool_id: parseInt(newToolId),
          profile_id: parseInt(newProfileId),
        })
      })
      if (res.ok) {
        setNewName('')
        setNewPattern('')
        await fetchRules()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${backendUrl}/api/automation/rules?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) await fetchRules()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggle = async (rule: Rule) => {
    try {
      await fetch(`${backendUrl}/api/automation/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, is_enabled: !rule.is_enabled })
      })
      await fetchRules()
    } catch (e) {
      console.error(e)
    }
  }

  const selectedTool = tools.find(t => t.id.toString() === newToolId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[80vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/5">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Zap className="size-5 text-accent animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black font-mono tracking-tight uppercase">Autonomous Rule Builder</h2>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] opacity-60">Programmable OODA Loop Orchestration</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted/20">
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Rule Creator - Left Panel */}
          <div className="w-[380px] border-r border-border p-6 space-y-6 bg-muted/5 overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                <Plus className="size-3 text-accent" /> Define New Trigger
              </h3>
              <div className="h-px bg-border w-full" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase ml-1">Rule Name</label>
                <Input 
                  placeholder="AUTO-SCAN-NMAP" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value.toUpperCase())}
                  className="h-10 font-mono text-xs uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase ml-1">Trigger Type</label>
                  <Select value={newTriggerType} onValueChange={(v: any) => setNewTriggerType(v)}>
                    <SelectTrigger className="h-10 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-mono text-xs">
                      <SelectItem value="domain">DOMAIN</SelectItem>
                      <SelectItem value="ip">IP</SelectItem>
                      <SelectItem value="service">SERVICE</SelectItem>
                      <SelectItem value="vuln">VULN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase ml-1">Pattern (Optional)</label>
                  <Input 
                    placeholder="e.g. staging" 
                    value={newPattern} 
                    onChange={e => setNewPattern(e.target.value)}
                    className="h-10 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase ml-1">Execute Tool</label>
                <Select value={newToolId} onValueChange={setNewToolId}>
                  <SelectTrigger className="h-10 text-xs font-mono">
                    <SelectValue placeholder="Select Tool..." />
                  </SelectTrigger>
                  <SelectContent className="font-mono text-xs">
                    {tools.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTool && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase ml-1">Attack Profile</label>
                  <Select value={newProfileId} onValueChange={setNewProfileId}>
                    <SelectTrigger className="h-10 text-xs font-mono">
                      <SelectValue placeholder="Select Profile..." />
                    </SelectTrigger>
                    <SelectContent className="font-mono text-xs">
                      {selectedTool.profiles?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={handleCreate} 
                disabled={creating || !newName || !newToolId || !newProfileId}
                className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-black font-mono uppercase text-xs shadow-lg"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : "Deploy Rule"}
              </Button>
            </div>

            <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <Shield className="size-3" />
                <span className="text-[9px] font-black font-mono uppercase tracking-widest">Logic Safety</span>
              </div>
              <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
                Autonomous rules include built-in recursion protection. Tools will not be triggered by discoveries they generated themselves.
              </p>
            </div>
          </div>

          {/* Active Rules - Right Panel */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/5">
              <h3 className="text-xs font-bold font-mono uppercase tracking-[0.2em] text-muted-foreground">Active Automation Matrix</h3>
              <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full font-bold">{rules.length} RULES DEPLOYED</span>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="size-8 text-primary/40 animate-spin" />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Loading Automation Matrix...</span>
                  </div>
                ) : rules.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 border border-dashed border-border rounded-xl">
                    <Zap className="size-12 text-muted-foreground/20" />
                    <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">No custom rules active. Define your first trigger.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {rules.map(rule => {
                      const t = tools.find(x => x.id === rule.tool_id)
                      const p = t?.profiles?.find((x: any) => x.id === rule.profile_id)
                      
                      return (
                        <div key={rule.id} className={cn(
                          "group relative bg-card border transition-all rounded-xl p-5 flex items-center gap-6 overflow-hidden",
                          rule.is_enabled ? "border-border hover:border-accent/40" : "border-border/40 opacity-60"
                        )}>
                          <div className={cn(
                            "size-12 rounded-lg flex items-center justify-center shrink-0 border",
                            rule.is_enabled ? "bg-accent/10 border-accent/20" : "bg-muted border-border"
                          )}>
                            <Fingerprint className={cn("size-6", rule.is_enabled ? "text-accent" : "text-muted-foreground")} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h4 className="text-sm font-black font-mono uppercase truncate">{rule.name}</h4>
                              {!rule.is_enabled && <span className="text-[8px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">DISABLED</span>}
                            </div>
                            
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase">
                                <Target className="size-3" /> {rule.trigger_type}
                                {rule.trigger_pattern && <span className="text-accent/60">[{rule.trigger_pattern}]</span>}
                              </div>
                              <ChevronRight className="size-3 text-border" />
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-foreground uppercase font-bold">
                                <Binary className="size-3 text-primary" /> {t?.name} <span className="text-muted-foreground font-normal">({p?.name})</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 relative z-10">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggle(rule)}
                              className={cn(
                                "size-9 rounded-lg border-border",
                                rule.is_enabled ? "text-accent hover:bg-accent/10" : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {rule.is_enabled ? <Pause className="size-4" /> : <Play className="size-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(rule.id)}
                              className="size-9 rounded-lg border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          {/* Subtle rule progress indicator */}
                          <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-1",
                            rule.is_enabled ? "bg-accent" : "bg-muted-foreground/20"
                          )} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Global Footer */}
        <div className="p-4 border-t border-border bg-muted/5 flex justify-between items-center shrink-0 px-6">
          <div className="flex items-center gap-2">
            <Zap className="size-3 text-accent" />
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Real-time OODA Matrix Synchronization Active</span>
          </div>
          <p className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-[0.3em]">
            Duelist Tactical Orchestration System
          </p>
        </div>
      </div>
    </div>
  )
}
