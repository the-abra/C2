'use client'

import { useEffect, useRef } from 'react'
import { Terminal, Copy, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalViewProps {
  logs: string // Raw string content
  processStatus: string
  selectedToolName: string
  target: string
  profileName: string
  onClear: () => void
}

export function TerminalView({
  logs,
  processStatus,
  selectedToolName,
  target,
  profileName,
  onClear,
}: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const lastProcessedLength = useRef<number>(0)
  const lastLogsRef = useRef<string>('')

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 11,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
        cursor: '#3b82f6',     // blue-500
        black: '#09090b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
      },
      allowProposedApi: true,
      convertEol: true,
      rows: 30,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Replay logs if they exist
    if (logs) {
      term.write(logs)
      lastProcessedLength.current = logs.length
    } else {
      term.writeln('\x1b[1;34mHELLISH DUELIST COMMAND CENTER [v1.0.0-PRO]\x1b[0m')
      term.writeln('\x1b[2m(c) 2026 tactical-engine. Binary resolution active.\x1b[0m')
      term.writeln('\x1b[2m$ system_ready_for_engagement_\x1b[0m\n')
    }

    lastLogsRef.current = logs

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
    // We only want to run this when the component mounts or the tool changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToolName])

  // Sync incremental logs
  useEffect(() => {
    if (!xtermRef.current) return

    // If logs were cleared
    if (!logs) {
      xtermRef.current.clear()
      xtermRef.current.reset()
      lastProcessedLength.current = 0
      lastLogsRef.current = ''
      return
    }

    // If logs were reset or changed to a different tool (handled by the mount effect above)
    // We only handle incremental updates here
    if (logs.length > lastProcessedLength.current) {
      const newPart = logs.substring(lastProcessedLength.current)
      xtermRef.current.write(newPart)
      lastProcessedLength.current = logs.length
    } else if (logs.length < lastProcessedLength.current) {
      // Something was removed (manual clear)
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
    a.href = url
    a.download = `${selectedToolName}-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#09090b]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-1.5 mr-2">
          <span className="size-2.5 rounded-full bg-red-500/60" />
          <span className="size-2.5 rounded-full bg-yellow-500/60" />
          <span className="size-2.5 rounded-full bg-green-500/60" />
        </div>
        <Terminal className="size-3.5 text-zinc-500" />
        <span className="flex-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          {processStatus === 'running' ? `ENGAGED: ${selectedToolName} (${profileName}) @ ${target}` : 'Duelist Engine Standby'}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0 hover:bg-white/5" title="Copy Selection">
            <Copy className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 w-6 p-0 hover:bg-white/5" title="Download Logs">
            <Download className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-6 w-6 p-0 hover:text-red-400" title="Clear Terminal">
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-2 overflow-hidden">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
      
      <div className="px-4 py-1 border-t border-white/5 bg-zinc-900/30 text-[9px] font-mono flex items-center gap-4 text-zinc-500 shrink-0">
        <span>ACTIVE: {selectedToolName}</span>
        <span>PROFILE: {profileName}</span>
        <span>STATUS: <span className={processStatus === 'running' ? 'text-green-400' : 'text-zinc-500'}>{processStatus.toUpperCase()}</span></span>
        <span className="flex-1" />
        <span>BYTES: {new Blob([logs]).size}</span>
      </div>
    </div>
  )
}
