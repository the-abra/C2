'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flag, X, Copy, Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface CapturedFlag {
  id: string
  value: string
  challenge: string
  timestamp: string
}

interface FlagCaptureProps {
  isOpen: boolean
  onClose: () => void
}

export function FlagCapture({ isOpen, onClose }: FlagCaptureProps) {
  const [flags, setFlags] = useState<CapturedFlag[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('ctf-flags') || '[]')
    } catch { return [] }
  })
  const [flagValue, setFlagValue] = useState('')
  const [challenge, setChallenge] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('ctf-flags', JSON.stringify(flags))
  }, [flags])

  // Global shortcut: Ctrl+F to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        // Toggle via custom event — dashboard listens
        document.dispatchEvent(new CustomEvent('toggle-flag-capture'))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!flagValue.trim()) return
    const entry: CapturedFlag = {
      id: Date.now().toString(),
      value: flagValue.trim(),
      challenge: challenge.trim() || 'Unknown',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    }
    setFlags(prev => [entry, ...prev])
    setFlagValue('')
    setChallenge('')
  }, [flagValue, challenge])

  const handleCopy = useCallback((id: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setFlags(prev => prev.filter(f => f.id !== id))
  }, [])

  const handleCopyAll = useCallback(() => {
    const allFlags = flags.map(f => f.value).join('\n')
    navigator.clipboard.writeText(allFlags)
  }, [flags])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/5">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Flag className="size-4 text-green-500" />
            </div>
            <div>
              <h2 className="text-sm font-black font-mono uppercase tracking-wider">Flag Vault</h2>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                {flags.length} flags captured
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {flags.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleCopyAll} className="text-[10px] font-mono uppercase h-7 px-2">
                <Copy className="size-3 mr-1" /> Copy All
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="size-7">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-b border-border space-y-2 bg-muted/5">
          <div className="flex gap-2">
            <Input
              value={flagValue}
              onChange={e => setFlagValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="flag{...}"
              className="flex-1 h-9 font-mono text-xs bg-muted/10 border-border"
              autoFocus
            />
            <Button onClick={handleSubmit} disabled={!flagValue.trim()} size="sm" className="h-9 px-3 font-mono text-xs uppercase font-bold bg-green-600 hover:bg-green-700 text-white">
              <Plus className="size-3 mr-1" /> Capture
            </Button>
          </div>
          <Input
            value={challenge}
            onChange={e => setChallenge(e.target.value)}
            placeholder="Challenge name (optional)"
            className="h-7 text-[10px] font-mono bg-muted/5 border-border/50"
          />
        </div>

        {/* Flag List */}
        <ScrollArea className="max-h-[300px]">
          <div className="p-3 space-y-2">
            {flags.length === 0 ? (
              <div className="py-8 text-center">
                <Flag className="size-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                  No flags captured yet. Go hunt!
                </p>
              </div>
            ) : (
              flags.map(f => (
                <div key={f.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border hover:border-green-500/30 transition-colors group">
                  <Flag className="size-3 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate text-foreground">{f.value}</p>
                    <p className="text-[9px] font-mono text-muted-foreground">
                      {f.challenge} · {f.timestamp}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleCopy(f.id, f.value)} className="p-1 rounded hover:bg-muted">
                      {copiedId === f.id ? <Check className="size-3 text-green-500" /> : <Copy className="size-3 text-muted-foreground" />}
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="p-1 rounded hover:bg-destructive/10">
                      <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
