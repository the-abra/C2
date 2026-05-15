'use client'

import { useState, useEffect } from 'react'
import { Key, X, Cloud, Save, Settings, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { get, set } from 'idb-keyval'

interface AIConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onShowToast: (title: string, description: string) => void
  backendUrl: string
}

export function AIConfigModal({ isOpen, onClose, onShowToast, backendUrl }: AIConfigModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [activeKey, setActiveKey] = useState('')
  const [models, setModels] = useState<any[]>([])
  const [persona, setPersona] = useState('You are an elite cybersecurity expert. Analyze the provided evidence and answer the user\'s questions accurately.')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [isDetecting, setIsDetecting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      get('ai-config').then((config: any) => {
        if (config) {
          if (config.apiKey) setActiveKey(config.apiKey)
          if (config.persona) setPersona(config.persona)
          if (config.ollamaUrl) setOllamaUrl(config.ollamaUrl)
          if (config.models) setModels(config.models)
        }
      })
    }
  }, [isOpen])

  const saveConfig = async (newConfig: any) => {
    const current = (await get('ai-config')) || {}
    const updated = { ...current, ...newConfig }
    await set('ai-config', updated)
    // Dispatch event so AIPanel updates
    document.dispatchEvent(new CustomEvent('ai-config-updated', { detail: updated }))
  }

  const handleDetectProvider = async () => {
    if (!apiKeyInput.trim()) return
    setIsDetecting(true)

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
          const mergedModels = [...models.filter(m => m.provider !== data.provider), ...newModels]
          setModels(mergedModels)
          setActiveKey(apiKeyInput)
          await saveConfig({ apiKey: apiKeyInput, models: mergedModels, selectedModel: newModels[0]?.id })
          setApiKeyInput('')
          onShowToast(`Provider Detected: ${data.provider}`, `${newModels.length} models loaded.`)
        } else {
          onShowToast('Detection Failed', 'Could not detect provider from key format.')
        }
      }
    } catch (e) {
      onShowToast('Error', 'Failed to reach backend for detection.')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleDetectOllama = async () => {
    setIsDetecting(true)
    try {
      // Check if backend can proxy to Ollama or just fetch directly if CORS allows
      const res = await fetch(`${ollamaUrl}/api/tags`)
      if (res.ok) {
        const data = await res.json()
        const newModels = data.models.map((m: any) => ({
          id: m.name,
          name: m.name,
          provider: 'Ollama',
          isLocal: true
        }))
        const mergedModels = [...models.filter(m => m.provider !== 'Ollama'), ...newModels]
        setModels(mergedModels)
        await saveConfig({ ollamaUrl, models: mergedModels, selectedModel: newModels[0]?.id })
        onShowToast('Ollama Connected', `${newModels.length} local models detected.`)
      } else {
        onShowToast('Ollama Error', 'Could not fetch models from Ollama URL.')
      }
    } catch (e) {
      onShowToast('Ollama Error', 'Failed to connect to Ollama. Ensure it is running and CORS is configured.')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleSaveSettings = async () => {
    await saveConfig({ persona, ollamaUrl })
    onShowToast('Settings Saved', 'AI configuration updated successfully.')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="size-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Settings className="size-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-tighter">AI Management</h3>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest opacity-70">Tokens & Local LLMs</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto size-8 p-0 text-zinc-500 hover:text-white">
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Authentication Key</label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={activeKey ? `Active: ••••${activeKey.slice(-8)}` : "sk-... | AIza... | ant-..."}
                className="h-11 font-mono text-sm bg-zinc-900 border-zinc-800 text-zinc-200 focus-visible:ring-1 focus-visible:ring-blue-500/40 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleDetectProvider()}
              />
              <Button onClick={handleDetectProvider} disabled={!apiKeyInput.trim()} className="h-11 bg-blue-600 hover:bg-blue-500 font-bold uppercase">
                Detect
              </Button>
            </div>
            <p className="text-[9px] font-mono text-zinc-600 uppercase flex items-center gap-2 px-1">
              <Cloud className="size-2.5" /> OpenAI / Google / Anthropic Supported
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">Ollama Base URL (Local LLM)</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="h-11 font-mono text-sm bg-zinc-900 border-zinc-800 text-zinc-200 focus-visible:ring-1 focus-visible:ring-blue-500/40 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleDetectOllama()}
              />
              <Button onClick={handleDetectOllama} disabled={isDetecting || !ollamaUrl.trim()} className="h-11 bg-zinc-800 hover:bg-zinc-700 font-bold uppercase">
                Detect
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest ml-1">System Persona</label>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs font-mono text-zinc-300 resize-none focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={isDetecting}
            className="w-full h-11 font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all rounded-lg mt-4"
          >
            {isDetecting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />} SAVE CONFIGURATION
          </Button>
        </div>
      </div>
    </div>
  )
}
