'use client'

import { useEffect, useRef } from 'react'
import { Terminal, Copy, Trash2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface LogLine {
  id: number
  text: string
  type: 'info' | 'success' | 'warning' | 'error' | 'data' | 'system' | 'cmd'
  timestamp: string
}

function colorLine(text: string): { type: LogLine['type'] } {
  const t = text.trim()
  if (!t) return { type: 'data' }
  if (t.startsWith('[!]') || t.includes('VULNERABLE') || t.includes('SIGKILL') || t.includes('TERMINATED'))
    return { type: 'error' }
  if (t.startsWith('[+]') || t.includes('open') || t.includes('injectable') || t.includes('found'))
    return { type: 'success' }
  if (t.startsWith('[*]') || t.includes('[INFO]') || t.startsWith('Nmap') || t.startsWith('Starting'))
    return { type: 'info' }
  if (t.startsWith('[WARNING]') || t.includes('might be') || t.includes('Outdated'))
    return { type: 'warning' }
  if (t.startsWith('commix(') || t.includes('$ ') || t.startsWith('> '))
    return { type: 'cmd' }
  if (t.startsWith('//') || t.startsWith('#'))
    return { type: 'system' }
  return { type: 'data' }
}

const LINE_COLORS: Record<LogLine['type'], string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  data: 'text-zinc-400',
  system: 'text-zinc-500',
  cmd: 'text-blue-300',
}

interface TerminalViewProps {
  logs: LogLine[]
  processStatus: string
  selectedToolName: string
  target: string
  profileName: string
  profileArgs?: string[]
  onClear: () => void
}

export function TerminalView({
  logs,
  processStatus,
  selectedToolName,
  target,
  profileName,
  profileArgs,
  onClear,
}: TerminalViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const handleDownload = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.text}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedToolName}-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black/95">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-zinc-900/50 shrink-0">
        <Terminal className="size-3.5 text-zinc-500" />
        <span className="flex-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-4">
          <span>{processStatus === 'running' ? `ENGAGED: ${selectedToolName} (${profileName}) @ ${target}` : 'Duelist Engine Standby'}</span>
          {profileArgs && profileArgs.length > 0 && (
            <span className="text-zinc-600 lowercase px-2 py-0.5 bg-white/5 rounded border border-white/5">{profileArgs.join(' ')}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={logs.length === 0} className="h-6 w-6 p-0 hover:bg-white/5">
            <Copy className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} disabled={logs.length === 0} className="h-6 w-6 p-0 hover:bg-white/5">
            <Download className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={logs.length === 0} className="h-6 w-6 p-0 hover:text-red-400">
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <div className="text-zinc-600 opacity-50">
              <p className="font-bold text-blue-500">HELLISH DUELIST COMMAND CENTER [v1.0.0-PRO]</p>
              <p className="mt-4 animate-pulse">[*] Awaiting connection output for {selectedToolName}...</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((line) => {
                const { type } = colorLine(line.text)
                return (
                  <div key={line.id} className="flex gap-4">
                    <span className="text-zinc-600 shrink-0 select-none">[{line.timestamp}]</span>
                    <span className={cn('break-all whitespace-pre-wrap flex-1', LINE_COLORS[type])}>{line.text}</span>
                  </div>
                )
              })}
              {processStatus === 'running' && <div className="text-blue-400 animate-pulse">$ _</div>}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      
      <div className="px-4 py-1 border-t border-white/5 bg-zinc-900/30 text-[9px] font-mono flex items-center gap-4 text-zinc-500">
        <span>ACTIVE: {selectedToolName}</span>
        <span>PROFILE: {profileName}</span>
        <span>STATUS: <span className={cn(processStatus === 'running' ? 'text-green-400' : '')}>{processStatus.toUpperCase()}</span></span>
        <span className="flex-1" />
        <span>LINES: {logs.length}</span>
      </div>
    </div>
  )
}
