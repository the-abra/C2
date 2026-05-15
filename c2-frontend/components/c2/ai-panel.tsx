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
  selectedEvidenceFiles: { target: string; filename: string }[]
  onToggleEvidenceFile: (target: string, filename: string) => void
}

export function AIPanel({ 
  isOpen, 
  onClose, 
  onShowToast, 
  backendUrl, 
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl h-[85vh] mx-4 flex bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl overflow-hidden">
        
        <div className="flex-1 flex flex-col min-w-0 bg-black">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Bot className="size-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold font-mono text-zinc-100 flex items-center gap-2">
                  DUELIST INTELLIGENCE
                </h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">Automated Analysis & Strategic Insight</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-56 h-9 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-300 focus:ring-1 focus:ring-blue-500/50">
                  <SelectValue placeholder="No Model Selected" />
                </SelectTrigger>
                <SelectContent className="z-[300] font-mono text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                      <div className="flex items-center gap-2 py-0.5">
                        <Cloud className="size-3 text-zinc-500" />
                        <div className="flex flex-col">
                          <span>{model.name}</span>
                          <span className="text-[9px] opacity-50 uppercase">{model.provider}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {models.length === 0 && (
                    <div className="p-4 text-center text-zinc-500 italic">No models configured</div>
                  )}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={onClose} className="size-9 p-0 text-zinc-500 hover:text-white hover:bg-zinc-900">
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-8 space-y-8 max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center py-32 flex flex-col items-center">
                  <div className="size-16 rounded-full bg-blue-500/5 flex items-center justify-center border border-blue-500/10 mb-6">
                    <Bot className="size-8 text-blue-500/40" />
                  </div>
                  <p className="text-sm font-mono text-zinc-400 font-bold tracking-widest uppercase">Engine Standby</p>
                  <p className="text-xs font-mono text-zinc-600 mt-3 max-w-xs leading-relaxed">
                    Attach evidence files and prompt the engine to begin analysis. Ensure a model is selected in the header.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={cn('flex gap-6', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="size-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-1 shadow-inner">
                        <Bot className="size-5 text-blue-400" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[85%] rounded-lg px-5 py-4 shadow-sm leading-relaxed',
                      msg.role === 'user' 
                        ? 'bg-blue-600/10 border border-blue-600/30 text-blue-50' 
                        : 'bg-zinc-900/40 border border-zinc-800 text-zinc-200'
                    )}>
                      <div className="text-[13px] font-mono whitespace-pre-wrap selection:bg-blue-500/30">
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-3 mt-4 pt-2 border-t border-zinc-800/40">
                        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">{msg.timestamp}</span>
                        {msg.model && (
                          <>
                            <span className="text-[9px] text-zinc-800">|</span>
                            <span className="text-[9px] font-mono text-blue-500/60 uppercase font-bold">{msg.model}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="size-9 rounded bg-blue-600/20 border border-blue-600/40 flex items-center justify-center shrink-0 mt-1">
                        <span className="text-xs font-mono font-bold text-blue-400">OPERATOR</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-6">
                  <div className="size-9 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
                    <Loader2 className="size-5 text-blue-500 animate-spin" />
                  </div>
                  <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-lg px-5 py-4 flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-600 animate-pulse uppercase tracking-widest">Processing Intelligence...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0">
            <div className="max-w-4xl mx-auto space-y-4">
              {selectedEvidenceFiles.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 uppercase font-bold mr-1">
                    <Paperclip className="size-3" /> Injected Context:
                  </span>
                  {selectedEvidenceFiles.map(f => (
                    <span key={`${f.target}-${f.filename}`} className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded flex items-center gap-2 transition-all hover:border-blue-500/40">
                      {f.filename}
                      <button onClick={() => onToggleEvidenceFile(f.target, f.filename)} className="hover:text-red-400"><X className="size-2.5" /></button>
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
                    "h-12 w-12 rounded-lg border-zinc-800 bg-zinc-900 flex-shrink-0 transition-all",
                    selectedEvidenceFiles.length > 0 ? "text-blue-400 border-blue-500/30 bg-blue-500/5" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                  )}
                  title="Attach Evidence Context"
                >
                  <Paperclip className="size-5" />
                </Button>

                <div className="flex-1 relative flex items-center">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={selectedModel ? "Analyze evidence with Gemini 3.1 / GPT-5.5..." : "Select a model to begin analysis..."}
                    disabled={isLoading || !selectedModel}
                    className="h-12 pl-4 pr-12 font-mono text-sm bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-blue-500/30 rounded-lg"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading || !selectedModel}
                    className="absolute right-1.5 h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-lg"
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
