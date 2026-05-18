'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Copy, Trash2, Download, X, Search, ArrowUp, ArrowDown } from 'lucide-react'
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
  
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<number[]>([])
  const [searchIndex, setSearchIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Search keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        setSearchOpen(prev => !prev)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchOpen])

  const handleSearch = useCallback((query: string) => {
    if (!query || !logs) { setSearchResults([]); return }
    const lines = logs.split('\n')
    const matches: number[] = []
    const q = query.toLowerCase()
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(q)) matches.push(i)
    })
    setSearchResults(matches)
    setSearchIndex(0)
    if (matches.length > 0 && xtermRef.current) {
      xtermRef.current.scrollToLine(Math.max(0, matches[0] - 2))
    }
  }, [logs])

  const jumpToResult = useCallback((dir: 'next' | 'prev') => {
    if (searchResults.length === 0) return
    let next = dir === 'next' ? searchIndex + 1 : searchIndex - 1
    if (next >= searchResults.length) next = 0
    if (next < 0) next = searchResults.length - 1
    setSearchIndex(next)
    if (xtermRef.current) {
      xtermRef.current.scrollToLine(Math.max(0, searchResults[next] - 2))
    }
  }, [searchResults, searchIndex])

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
  }, []) 

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
      {/* Main Terminal Area */}
      <div className="flex-1 min-h-0 p-2 overflow-hidden bg-[#0a0a0c]">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
      
      {/* Absolute Tool Bar Overlay */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-20 hover:opacity-100 transition-opacity">
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

      {/* Search Overlay */}
      {searchOpen && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg shadow-xl">
          <Search className="size-3 text-muted-foreground" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value) }}
            onKeyDown={e => {
              if (e.key === 'Enter') jumpToResult(e.shiftKey ? 'prev' : 'next')
              if (e.key === 'Escape') setSearchOpen(false)
            }}
            placeholder="Search output..."
            className="bg-transparent border-none outline-none text-xs font-mono text-foreground w-48 placeholder:text-muted-foreground/50"
            autoFocus
          />
          {searchResults.length > 0 && (
            <span className="text-[9px] font-mono text-muted-foreground">
              {searchIndex + 1}/{searchResults.length}
            </span>
          )}
          <button onClick={() => jumpToResult('prev')} className="p-1 hover:bg-muted rounded">
            <ArrowUp className="size-3 text-muted-foreground" />
          </button>
          <button onClick={() => jumpToResult('next')} className="p-1 hover:bg-muted rounded">
            <ArrowDown className="size-3 text-muted-foreground" />
          </button>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]) }} className="p-1 hover:bg-muted rounded">
            <X className="size-3 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  )
}
