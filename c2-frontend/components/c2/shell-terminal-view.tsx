'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface ShellTerminalViewProps {
  backendUrl: string
  sessionId: string
  isActive: boolean
}

export function ShellTerminalView({ backendUrl, sessionId, isActive }: ShellTerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const handleFit = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current && isActive) {
      try {
        fitAddonRef.current.fit()
      } catch (e) { /* ignore fit errors when hidden */ }
    }
  }, [isActive])

  useEffect(() => {
    if (!terminalRef.current) return

    // 1. Initialize xterm.js
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

    // 2. Establish WebSocket connection
    const wsProto = backendUrl.startsWith('https') ? 'wss' : 'ws'
    const cleanUrl = backendUrl.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProto}://${cleanUrl}/shell`
    
    console.log(`[ShellTerminal] Connecting to WS: ${wsUrl}`)
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      try {
        term.writeln('\x1b[32m[+] INTERACTIVE OS SHELL SESSION ESTABLISHED\x1b[0m')
        term.writeln('\x1b[90mSecure PTY connected to local host process\x1b[0m\n')
      } catch (e) {
        console.warn('[ShellTerminal] Error inside ws.onopen:', e)
      }
    }

    ws.onmessage = (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(event.data))
        } else {
          term.write(event.data)
        }
      } catch (e) {
        console.warn('[ShellTerminal] Error inside ws.onmessage:', e)
      }
    }

    term.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    ws.onclose = () => {
      term.writeln('\n\x1b[31m[!] PTY SHELL DISCONNECTED\x1b[0m')
    }

    ws.onerror = (err) => {
      console.warn('[ShellTerminal] WebSocket error:', err)
      term.writeln('\n\x1b[31m[!] WEBSOCKET ERROR OCCURRED\x1b[0m')
    }

    // 3. Cleanup on unmount or tab switch
    return () => {
      console.log(`[ShellTerminal] Cleaning up session: ${sessionId}`)
      observer.disconnect()
      
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close()
        }
        wsRef.current = null
      }

      if (xtermRef.current) {
        xtermRef.current.dispose()
        xtermRef.current = null
      }
      fitAddonRef.current = null
    }
  }, [backendUrl, sessionId, handleFit])

  // Fit terminal when it becomes active
  useEffect(() => {
    if (isActive) {
      setTimeout(handleFit, 50)
    }
  }, [isActive, handleFit])

  return (
    <div className="h-full w-full bg-[#0a0a0c] p-2 overflow-hidden flex flex-col">
      <div ref={terminalRef} className="flex-1 w-full h-full" />
    </div>
  )
}
