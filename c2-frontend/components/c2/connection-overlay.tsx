'use client'

import { useState } from 'react'
import { Shield, Wifi, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConnectionOverlayProps {
  onConnect: (url: string) => void
}

type ConnectionState = 'idle' | 'connecting' | 'error'

const BOOT_LINES = [
  'Initializing C2 kernel modules...',
  'Loading exploit framework v4.2.1...',
  'Establishing direct tunnel...',
  'Mounting payload filesystem...',
  'Ready.',
]

export function ConnectionOverlay({ onConnect }: ConnectionOverlayProps) {
  const [url, setUrl] = useState('http://localhost:1453')
  const [state, setState] = useState<ConnectionState>('idle')
  const [bootIndex, setBootIndex] = useState(0)

  const handleConnect = () => {
    if (!url.trim()) return
    setState('connecting')
    setBootIndex(0)

    // Animate boot lines
    let idx = 0
    const lineInterval = setInterval(() => {
      idx++
      setBootIndex(idx)
      if (idx >= BOOT_LINES.length) {
        clearInterval(lineInterval)
        setTimeout(() => onConnect(url), 200)
      }
    }, 160)
  }

  const isConnecting = state === 'connecting'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop with subtle scan line */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm">
        {/* Very subtle scan line animation */}
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-30 animate-scan pointer-events-none" />
        {/* Grid overlay — very muted */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(var(--muted-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--muted-foreground) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Modal card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="relative bg-card border border-border rounded-md p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center size-10 rounded bg-secondary border border-border">
              <Shield className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold font-mono text-foreground tracking-tight">
                Connect to C2 Backend
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Establish direct REST/WebSocket channel
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mb-6" />

          {/* URL Input */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Backend API / WebSocket URL
            </label>
            <div className="relative">
              <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isConnecting}
                className="pl-9 font-mono text-sm bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:border-ring"
                placeholder="http://localhost:1453"
                onKeyDown={(e) => e.key === 'Enter' && !isConnecting && handleConnect()}
              />
            </div>
          </div>

          {/* Boot log (shown while connecting) */}
          {isConnecting && (
            <div className="mb-5 rounded bg-terminal border border-border p-3 font-mono text-xs space-y-1">
              {BOOT_LINES.slice(0, bootIndex).map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3 shrink-0 text-accent" />
                  <span className="text-accent">{line}</span>
                </div>
              ))}
              {bootIndex < BOOT_LINES.length && (
                <div className="flex items-center gap-2">
                  <div className="size-3 shrink-0 flex items-center justify-center">
                    <span className="size-2 rounded-full bg-primary/60 animate-subtle-pulse block" />
                  </div>
                  <span className="text-muted-foreground">
                    {BOOT_LINES[bootIndex]}
                    <span className="animate-blink">_</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="mb-5 flex items-center gap-2 text-destructive text-xs font-mono bg-destructive/10 border border-destructive/30 rounded p-2">
              <AlertCircle className="size-4 shrink-0" />
              Connection refused. Verify backend is running.
            </div>
          )}

          {/* Connect button */}
          <Button
            className="w-full font-mono font-semibold tracking-wider bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-200"
            onClick={handleConnect}
            disabled={isConnecting || !url.trim()}
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <span className="size-3 border border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Establishing Connection...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Wifi className="size-4" />
                Connect
              </span>
            )}
          </Button>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground font-mono mt-4">
            All communications are synchronized in real-time
          </p>
        </div>
      </div>
    </div>
  )
}
