'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, X, Send, Paperclip, Loader2, FileText, Check, Folder, Cloud
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { get } from 'idb-keyval'
import { AIContextModal } from './ai-context-modal'
import { compileSessionContext } from '@/lib/api-service'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  model?: string
}

export interface AIModel {
  id: string
  name: string
  provider: string
  isLocal: boolean
}

interface AIPanelProps {
  isOpen: boolean
  onClose: () => void
  onShowToast: (title: string, description: string) => void
  backendUrl: string
  sessionId: number
  selectedEvidenceFiles: { target: string; filename: string }[]
  onToggleEvidenceFile: (target: string, filename: string) => void
}

export function AIPanel({ 
  isOpen, 
  onClose, 
  onShowToast, 
  backendUrl, 
  sessionId,
  selectedEvidenceFiles, 
  onToggleEvidenceFile
}: AIPanelProps) {
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeKey, setActiveKey] = useState('')
  const [persona, setPersona] = useState('You are an elite cybersecurity expert. Analyze the provided evidence and answer the user\'s questions accurately.')
  
  const [isContextModalOpen, setIsContextModalOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadConfig = useCallback(async () => {
    const config = await get('ai-config')
    if (config) {
      if (config.models) setModels(config.models)
      if (config.apiKey) setActiveKey(config.apiKey)
      if (config.persona) setPersona(config.persona)
      if (config.selectedModel) setSelectedModel(config.selectedModel)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen, loadConfig])

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const config = e.detail
      if (config.models) setModels(config.models)
      if (config.apiKey) setActiveKey(config.apiKey)
      if (config.persona) setPersona(config.persona)
      if (config.selectedModel) setSelectedModel(config.selectedModel)
    }
    document.addEventListener('ai-config-updated', handleUpdate)
    return () => document.removeEventListener('ai-config-updated', handleUpdate)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleInjectSessionContext = async () => {
    if (!sessionId) return
    setIsLoading(true)
    try {
      const ctx = await compileSessionContext(backendUrl, sessionId)
      setInputValue((prev) => prev + (prev ? "\n\n" : "") + ctx)
      onShowToast("Context Injected", "Real-time session data added to prompt.")
    } catch (e) {
      onShowToast("Error", "Failed to compile session context.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const res = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          message: userMessage.content,
          persona,
          api_key: activeKey,
          selected_files: selectedEvidenceFiles
        })
      })
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      setMessages((prev) => [...prev, {
        id: data.id || crypto.randomUUID(),
        role: data.role || 'assistant',
        content: data.content || '',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        model: data.model || selectedModel
      }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Error: Failed to get response. Check your connection and AI configuration.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, selectedModel, persona, activeKey, selectedEvidenceFiles, backendUrl])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl h-[85vh] mx-4 flex bg-background border border-border rounded-md shadow-2xl overflow-hidden">
        
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="size-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold font-mono text-foreground flex items-center gap-2">
                  DUELIST INTELLIGENCE
                </h2>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">Automated Analysis & Strategic Insight</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-56 h-9 text-xs font-mono bg-muted/10 border-border text-muted-foreground focus:ring-1 focus:ring-primary/50">
                  <SelectValue placeholder="No Model Selected" />
                </SelectTrigger>
                <SelectContent className="z-[300] font-mono text-xs bg-background border-border text-muted-foreground">
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                      <div className="flex items-center gap-2 py-0.5">
                        <Cloud className="size-3 text-muted-foreground/50" />
                        <div className="flex flex-col">
                          <span>{model.name}</span>
                          <span className="text-[9px] opacity-50 uppercase">{model.provider}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {models.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground italic">No models configured</div>
                  )}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={onClose} className="size-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/10">
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-8 space-y-8 max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center py-32 flex flex-col items-center">
                  <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 mb-6">
                    <Bot className="size-8 text-primary/40" />
                  </div>
                  <p className="text-sm font-mono text-muted-foreground font-bold tracking-widest uppercase">Engine Standby</p>
                  <p className="text-xs font-mono text-muted-foreground/60 mt-3 max-w-xs leading-relaxed">
                    Attach evidence files and prompt the engine to begin analysis. Ensure a model is selected in the header.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={cn('flex gap-6', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="size-9 rounded bg-muted/10 border border-border flex items-center justify-center shrink-0 mt-1 shadow-inner">
                        <Bot className="size-5 text-primary" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[85%] rounded-lg px-5 py-4 shadow-sm leading-relaxed',
                      msg.role === 'user' 
                        ? 'bg-primary/10 border border-primary/30 text-foreground' 
                        : 'bg-muted/10 border border-border text-foreground'
                    )}>
                      <div className="text-[13px] font-mono whitespace-pre-wrap selection:bg-primary/30">
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-3 mt-4 pt-2 border-t border-border/40">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-tighter">{msg.timestamp}</span>
                        {msg.model && (
                          <>
                            <span className="text-[9px] text-border">|</span>
                            <span className="text-[9px] font-mono text-primary/60 uppercase font-bold">{msg.model}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="size-9 rounded bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 mt-1">
                        <span className="text-xs font-mono font-bold text-primary">OPERATOR</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-6">
                  <div className="size-9 rounded bg-muted/10 border border-border flex items-center justify-center shrink-0 shadow-inner">
                    <Loader2 className="size-5 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted/5 border border-border/50 rounded-lg px-5 py-4 flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground animate-pulse uppercase tracking-widest">Processing Intelligence...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-background shrink-0">
            <div className="max-w-4xl mx-auto space-y-4">
              {selectedEvidenceFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 uppercase font-bold mr-1">
                    <Paperclip className="size-3" /> Injected Context:
                  </span>
                  {selectedEvidenceFiles.map(f => (
                    <span key={`${f.target}-${f.filename}`} className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded flex items-center gap-2 transition-all hover:border-primary/40">
                      {f.filename}
                      <button onClick={() => onToggleEvidenceFile(f.target, f.filename)} className="hover:text-destructive"><X className="size-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsContextModalOpen(true)}
                  className={cn(
                    "h-12 w-12 rounded-lg border-border bg-muted/10 flex-shrink-0 transition-all",
                    selectedEvidenceFiles.length > 0 ? "text-primary border-primary/30 bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  )}
                  title="Attach Evidence Context"
                >
                  <Paperclip className="size-5" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInjectSessionContext}
                  className="h-12 w-12 rounded-lg border-border bg-muted/10 flex-shrink-0 text-muted-foreground hover:text-accent hover:bg-accent/10"
                  title="Inject Real-time Session Data"
                >
                  <Folder className="size-5" />
                </Button>

                <div className="flex-1 relative flex items-center">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={selectedModel ? "Analyze evidence with AI..." : "Select a model to begin analysis..."}
                    disabled={isLoading || !selectedModel}
                    className="h-12 pl-4 pr-12 font-mono text-sm bg-muted/10 border-border text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading || !selectedModel}
                    className="absolute right-1.5 h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-all shadow-lg"
                  >
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AIContextModal 
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        backendUrl={backendUrl}
        selectedFiles={selectedEvidenceFiles}
        onToggleFile={onToggleEvidenceFile}
      />
    </div>
  )
}
