'use client'

import { useState, useEffect } from 'react'
import { Key, X, Cloud, Save, Settings, Loader2, Brain, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { get, set } from 'idb-keyval'
import { cn } from '@/lib/utils'

interface AIConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onShowToast: (title: string, description: string) => void
  backendUrl: string
}

export function AIConfigModal({ isOpen, onClose, onShowToast, backendUrl }: AIConfigModalProps) {
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [persona, setPersona] = useState('You are an elite cybersecurity expert. Analyze the provided evidence and answer the user\'s questions accurately.')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connected' | 'error'>('idle')

  const fetchModels = async () => {
    setLoading(true)
    setStatus('idle')
    try {
      const res = await fetch(`${backendUrl}/api/ai/models`)
      if (res.ok) {
        const data = await res.json()
        setModels(data || [])
        setStatus('connected')
        if (data.length > 0 && !selectedModel) {
          setSelectedModel(data[0])
        }
      } else {
        setStatus('error')
      }
    } catch (e) {
      console.error(e)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      get('ai-config').then((config: any) => {
        if (config) {
          if (config.persona) setPersona(config.persona)
          if (config.selectedModel) setSelectedModel(config.selectedModel)
        }
        fetchModels()
      })
    }
  }, [isOpen])

  const handleSave = async () => {
    const updated = { 
      persona, 
      selectedModel, 
      provider: 'Ollama',
      isLocal: true 
    }
    await set('ai-config', updated)
    // Persist model choice to backend if needed (optional, we use it in ProxyCall)
    
    document.dispatchEvent(new CustomEvent('ai-config-updated', { detail: updated }))
    onShowToast('Intelligence Updated', `Local model ${selectedModel} synchronized.`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-border bg-muted/5">
          <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono text-foreground uppercase tracking-tight">Intelligence Config</h3>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest opacity-60">Local Ollama Orchestration</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto hover:bg-muted/20">
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Indicator */}
          <div className={cn(
            "p-3 rounded-lg border flex items-center gap-3 transition-colors",
            status === 'connected' ? "bg-accent/5 border-accent/20" : 
            status === 'error' ? "bg-destructive/5 border-destructive/20" : "bg-muted/10 border-border"
          )}>
            {loading ? <Loader2 className="size-4 animate-spin text-primary" /> :
             status === 'connected' ? <CheckCircle2 className="size-4 text-accent" /> :
             status === 'error' ? <AlertCircle className="size-4 text-destructive" /> : <Settings className="size-4 text-muted-foreground" />}
            
            <div className="flex-1">
              <p className="text-[10px] font-black font-mono uppercase tracking-widest leading-none">
                {loading ? "Scanning for local models..." :
                 status === 'connected' ? "Ollama Connected" :
                 status === 'error' ? "Ollama Unreachable" : "Checking Status..."}
              </p>
              <p className="text-[9px] font-mono text-muted-foreground mt-1 uppercase">
                {status === 'connected' ? `${models.length} tactical models identified` : "Ensure Ollama service is running"}
              </p>
            </div>

            {status !== 'connected' && !loading && (
              <Button size="sm" variant="ghost" onClick={fetchModels} className="h-6 text-[9px] font-mono hover:bg-primary/10">RETRY</Button>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase ml-1">Active Tactical Model</label>
            <div className="grid grid-cols-1 gap-1.5">
              {models.length === 0 && !loading && (
                <div className="p-4 border border-dashed border-border rounded-lg text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">No models found in Ollama library</p>
                </div>
              )}
              {models.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-lg border font-mono text-xs transition-all",
                    selectedModel === m 
                      ? "bg-primary/10 border-primary/40 text-primary shadow-sm" 
                      : "border-border hover:border-primary/20 text-muted-foreground"
                  )}
                >
                  {m.toUpperCase()}
                  {selectedModel === m && <CheckCircle2 className="size-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Persona */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase ml-1">System Persona Profile</label>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full h-24 bg-muted/10 border border-border rounded-lg p-3 text-xs font-mono text-foreground resize-none focus:outline-none focus:border-primary/40 transition-colors leading-relaxed"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!selectedModel || status !== 'connected'}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black font-mono uppercase text-xs shadow-lg rounded-lg"
          >
            Deploy Tactical Intelligence
          </Button>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/5 text-center">
          <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest opacity-40">
            Local Isolation Mode — No Data Leaves This Environment
          </p>
        </div>
      </div>
    </div>
  )
}
