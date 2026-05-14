'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, X, Send, Paperclip, Plus, Key, Cloud, Loader2, FileText, Settings, Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
  targetContext?: string
  onShowToast: (title: string, description: string) => void
  backendUrl: string
  selectedEvidenceFiles: { target: string; filename: string }[]
  onToggleEvidenceFile: (target: string, filename: string) => void
  onOpenEvidence: () => void
}

export function AIPanel({ 
  isOpen, 
  onClose, 
  onShowToast, 
  backendUrl, 
  selectedEvidenceFiles, 
  onToggleEvidenceFile,
  onOpenEvidence 
}: AIPanelProps) {
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [activeKey, setActiveKey] = useState('')

  const [showSettings, setShowSettings] = useState(false)
  const [persona, setPersona] = useState('You are an elite cybersecurity expert. Analyze the provided evidence and answer the user\'s questions accurately.')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
          content: 'Error: Failed to get response. Check your connection and API configuration.',
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, selectedModel, persona, activeKey, selectedEvidenceFiles, backendUrl])

  const handleDetectProvider = async () => {
    if (!apiKeyInput.trim()) return

    try {
      const res = await fetch(`${backendUrl}/api/ai/detect-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKeyInput })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.provider !== 'Unknown') {
          const newModels = data.models.map((m: string) => ({ 
            id: m, 
            name: m, 
            provider: data.provider, 
            isLocal: false 
          }))
          setModels(newModels)
          if(newModels.length > 0) setSelectedModel(newModels[0].id)
          setActiveKey(apiKeyInput)
          setShowApiKeyModal(false)
          setApiKeyInput('')
          onShowToast(`Provider Detected: ${data.provider}`, `${newModels.length} models loaded including latest versions.`)
        } else {
          onShowToast('Detection Failed', 'Could not detect provider from key format.')
        }
      }
    } catch (e) {
      onShowToast('Error', 'Failed to reach backend for detection.')
    }
  }

  const handleModelChange = (value: string) => {
    if (value === 'add-api-key') {
      setShowApiKeyModal(true)
    } else {
      setSelectedModel(value)
    }
  }

  const clearChat = () => {
    if(confirm('Clear entire conversation history?')) {
      setMessages([])
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Main Panel */}
      <div className="fixed inset-0 z-[150] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-5xl h-[85vh] mx-4 flex bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl overflow-hidden">
          
          {/* Settings Sidebar */}
          {showSettings && (
            <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
              <div className="p-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="size-4 text-zinc-400" />
                  <span className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-tighter">AI Configuration</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSettings(false)}>
                   <X className="size-3" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                      Persona / System Prompt
                    </label>
                    <textarea 
                      value={persona}
                      onChange={(e) => setPersona(e.target.value)}
                      className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                      placeholder="Define the AI's persona..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Active API Key</label>
                    <div className="bg-zinc-950 border border-zinc-800 rounded p-2 flex items-center justify-between">
                       <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[150px]">
                         {activeKey ? `••••${activeKey.slice(-8)}` : 'No key active'}
                       </span>
                       <Button variant="ghost" size="sm" className="h-6 text-[9px] hover:text-blue-400" onClick={() => setShowApiKeyModal(true)}>
                         CHANGE
                       </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-8 text-[10px] font-mono border-zinc-800 bg-zinc-950 hover:bg-red-500/10 hover:text-red-400"
                      onClick={clearChat}
                    >
                      <Trash2 className="size-3 mr-2" /> CLEAR CONVERSATION
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-black">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("size-8 rounded transition-all", showSettings ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-zinc-500 hover:text-zinc-300")} 
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="size-4" />
                </Button>
                <div>
                  <h2 className="text-sm font-semibold font-mono text-zinc-100 flex items-center gap-2">
                    <Bot className="size-4 text-blue-400" />
                    DUELIST INTELLIGENCE
                  </h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">Automated Vulnerability Analysis Engine</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedModel} onValueChange={handleModelChange}>
                  <SelectTrigger className="w-56 h-9 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-300 focus:ring-1 focus:ring-blue-500/50">
                    <SelectValue placeholder="Load Model..." />
                  </SelectTrigger>
                  <SelectContent className="z-[300] font-mono text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="cursor-pointer focus:bg-blue-500/10 focus:text-blue-300">
                        <div className="flex items-center gap-2 py-0.5">
                          <Cloud className="size-3 text-zinc-500" />
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            <span className="text-[9px] opacity-50 uppercase">{model.provider}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    <div className="h-px bg-zinc-800 my-1" />
                    <SelectItem value="add-api-key" className="cursor-pointer text-blue-400 font-bold focus:bg-blue-500/10 focus:text-blue-300">
                      <div className="flex items-center gap-2">
                        <Plus className="size-3" />
                        <span>CONFIGURE API ACCESS</span>
                      </div>
                    </SelectItem>
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
                      Initialize configuration or attach evidence logs to begin tactical analysis.
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
                      <Paperclip className="size-3" /> Files Injected:
                    </span>
                    {selectedEvidenceFiles.map(f => (
                      <span key={`${f.target}-${f.filename}`} className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded flex items-center gap-2 transition-all hover:border-blue-500/40">
                        {f.filename}
                        <button onClick={() => onToggleEvidenceFile(f.target, f.filename)} className="hover:text-red-400"><X className="size-2.5" /></button>
                      </span>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-[9px] text-zinc-600 hover:text-zinc-300" onClick={onOpenEvidence}>
                      EDIT LIST
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenEvidence}
                    className={cn(
                      "h-12 w-12 rounded-lg border-zinc-800 bg-zinc-900 flex-shrink-0 transition-all",
                      selectedEvidenceFiles.length > 0 ? "text-blue-400 border-blue-500/30 bg-blue-500/5" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                    )}
                    title="Attach Evidence from Explorer"
                  >
                    <Paperclip className="size-5" />
                  </Button>
                  <div className="flex-1 relative flex items-center">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={selectedModel ? "Describe analysis objective or ask about findings..." : "Please load a model to begin conversation..."}
                      disabled={isLoading || !selectedModel}
                      className="h-12 pl-4 pr-12 font-mono text-sm bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-blue-500/30 rounded-lg"
                    />
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading || !selectedModel}
                      className="absolute right-1.5 h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-lg shadow-blue-900/20 group"
                    >
                      {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowApiKeyModal(false)} />
          <div className="relative w-full max-w-md mx-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800 bg-zinc-900/50">
              <div className="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Key className="size-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-tighter">AI Access Token</h3>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest opacity-70">Secured Provider Handshake</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowApiKeyModal(false)} className="ml-auto size-8 p-0 text-zinc-500 hover:text-white">
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Authentication Key</label>
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-... | AIza... | ant-..."
                  className="h-11 font-mono text-sm bg-zinc-900 border-zinc-800 text-zinc-200 focus-visible:ring-1 focus-visible:ring-blue-500/40"
                  onKeyDown={(e) => e.key === 'Enter' && handleDetectProvider()}
                />
                <div className="flex flex-col gap-2 mt-2 px-1">
                  <p className="text-[9px] font-mono text-zinc-600 uppercase flex items-center gap-2">
                    <Cloud className="size-2.5" /> OpenAI / Google / Anthropic Supported
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDetectProvider}
                disabled={!apiKeyInput.trim()}
                className="w-full h-11 font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all rounded-lg"
              >
                INITIALIZE HANDSHAKE
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
