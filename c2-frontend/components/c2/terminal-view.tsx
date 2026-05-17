'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal, Copy, Trash2, Download, Zap, Loader2, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { cn } from '@/lib/utils'

interface TerminalViewProps {
  logs: string // Raw string content
  processStatus: string
  selectedToolName: string
  target: string
  profileName: string
  onClear: () => void
  backendUrl: string
  sessionId: number
}

export function TerminalView({
  logs,
  processStatus,
  selectedToolName,
  target,
  profileName,
  onClear,
  backendUrl,
  sessionId
}: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const lastProcessedLength = useRef<number>(0)
  const lastLogsRef = useRef<string>('')
  
  // AI Suggestions State
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const fetchSuggestions = async () => {
    if (!sessionId || loadingSuggestions) return
    setLoadingSuggestions(true)
    try {
      const res = await fetch(`${backendUrl}/api/ai/next-steps?session_id=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data || [])
      }
    } catch (e) {
      console.error('Failed to fetch suggestions', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    if (sessionId) {
      fetchSuggestions()
    }
  }, [sessionId, processStatus])

  // Resize Handling to fix width bug
  const handleFit = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      try {
        fitAddonRef.current.fit()
      } catch (e) { /* ignore fit errors when hidden */ }
    }
  }, [])

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 11,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
      theme: {
        background: '#0a0a0c', 
        foreground: '#d4d4d8', 
        cursor: '#60a5fa',     
        black: '#0a0a0c',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#d4d4d8',
      },
      allowProposedApi: true,
      convertEol: true,
      rows: 30,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    
    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Initial fit
    setTimeout(handleFit, 50)

    // Resize Observer for the container
    const observer = new ResizeObserver(() => {
      handleFit()
    })
    observer.observe(terminalRef.current)

    if (logs) {
      term.write(logs)
      lastProcessedLength.current = logs.length
    }

    lastLogsRef.current = logs

    return () => {
      observer.disconnect()
      term.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps, we handle log updates via useEffect

  // Sync incremental logs
  useEffect(() => {
    if (!xtermRef.current) return

    if (!logs) {
      xtermRef.current.clear()
      xtermRef.current.reset()
      lastProcessedLength.current = 0
      lastLogsRef.current = ''
      return
    }

    if (logs.length > lastProcessedLength.current) {
      const newPart = logs.substring(lastProcessedLength.current)
      xtermRef.current.write(newPart)
      lastProcessedLength.current = logs.length
    } else if (logs.length < lastProcessedLength.current) {
      xtermRef.current.clear()
      xtermRef.current.reset()
      xtermRef.current.write(logs)
      lastProcessedLength.current = logs.length
    }
    
    lastLogsRef.current = logs
  }, [logs])

  const handleCopy = () => {
    if (!xtermRef.current) return
    const selection = xtermRef.current.getSelection()
    if (selection) {
      navigator.clipboard.writeText(selection)
    } else {
      navigator.clipboard.writeText(logs)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${selectedToolName}-${Date.now()}.log`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
      {/* Suggestions Bar */}
      <div className="px-4 py-1.5 border-b border-border bg-muted/5 flex items-center gap-3 shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 text-accent shrink-0">
          {loadingSuggestions ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
          <span className="text-[9px] font-black font-mono uppercase tracking-widest">Tactical Suggestions:</span>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {suggestions.length === 0 && !loadingSuggestions && (
            <span className="text-[9px] font-mono text-muted-foreground italic uppercase">Gathering mission intelligence...</span>
          )}
          {suggestions.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => document.dispatchEvent(new CustomEvent('populate-command', { detail: cmd }))}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-accent/10 border border-accent/20 hover:border-accent/50 text-[10px] font-mono text-accent whitespace-nowrap transition-all group"
            >
              <Zap className="size-2.5 opacity-60 group-hover:animate-pulse" />
              {cmd}
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-[9px] font-mono hover:bg-accent/10 text-muted-foreground hover:text-accent" onClick={fetchSuggestions}>
          REFRESH
        </Button>
      </div>

      {/* Main Terminal Area */}
      <div className="flex-1 min-h-0 p-2 overflow-hidden bg-[#0a0a0c]">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
      
      {/* Absolute Tool Bar Overlay */}
      <div className="absolute top-10 right-4 flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity">
        <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 w-7 p-0 bg-background/50 border-border" title="Copy Selection">
          <Copy className="size-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 w-7 p-0 bg-background/50 border-border" title="Download Logs">
          <Download className="size-3" />
        </Button>
        <Button variant="outline" size="sm" onClick={onClear} className="h-7 w-7 p-0 bg-background/50 border-border hover:text-destructive" title="Clear Terminal">
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  )
}
