'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { X, Maximize2, Minimize2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ShellPanelProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
}

export function ShellPanel({ isOpen, onClose, backendUrl }: ShellPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (isOpen && terminalRef.current && !xtermRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"Fira Code", monospace',
        theme: {
          background: '#09090b',
          foreground: '#a1a1aa',
          cursor: '#3b82f6',
        },
      })
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()
      xtermRef.current = term

      const wsUrl = `${backendUrl.replace('http', 'ws')}/shell`
      const ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        term.writeln('\x1b[32m[+] SECURE SHELL ESTABLISHED\x1b[0m')
        term.writeln('\x1b[90mConnected to tactical backend terminal\x1b[0m\n')
      }

      ws.onmessage = (event) => {
        term.write(new Uint8Array(event.data))
      }

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data)
        }
      })

      ws.onclose = () => {
        term.writeln('\n\x1b[31m[!] CONNECTION CLOSED\x1b[0m')
      }
    }

    return () => {
      if (!isOpen && wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
        if (xtermRef.current) {
          xtermRef.current.dispose()
          xtermRef.current = null
        }
      }
    }
  }, [isOpen, backendUrl])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className={cn(
        "relative flex flex-col bg-card border border-border shadow-2xl rounded-lg overflow-hidden transition-all duration-300",
        isMaximized ? "w-full h-full" : "w-full max-w-4xl h-[70vh]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded bg-primary/10 border border-primary/20">
              <Terminal className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground uppercase tracking-tight">Interactive Live Terminal</h3>
              <p className="text-[10px] font-mono text-muted-foreground opacity-70">Direct PTY access — execute with caution</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMaximized(!isMaximized)}
              className="size-8 p-0 text-muted-foreground hover:text-foreground"
            >
              {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Terminal Area */}
        <div className="flex-1 min-h-0 bg-[#09090b] p-2">
          <div ref={terminalRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}


export default ShellPanel
