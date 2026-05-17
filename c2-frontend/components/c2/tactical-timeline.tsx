'use client'

import { useState, useEffect } from 'react'
import { 
  History, Clock, Target, Zap, Bot, FileText, CheckCircle2, 
  XCircle, Loader2, Trash2, RefreshCw, ChevronRight, Binary
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface TimelineEvent {
  id: number
  type: 'job_started' | 'job_finished' | 'discovery' | 'ai_insight' | 'note_saved' | 'auto_pilot'
  title: string
  description: string
  timestamp: string
}

interface TacticalTimelineProps {
  backendUrl: string
  sessionId: number
}

const EVENT_CONFIG: Record<string, any> = {
  job_started: { icon: Play, color: 'text-primary' },
  job_finished: { icon: CheckCircle2, color: 'text-primary/60' },
  discovery: { icon: Target, color: 'text-accent' },
  ai_insight: { icon: Bot, color: 'text-accent' },
  note_saved: { icon: FileText, color: 'text-muted-foreground' },
  auto_pilot: { icon: Zap, color: 'text-accent' },
}

function Play(props: any) { return <ChevronRight {...props} /> }

export function TacticalTimeline({ backendUrl, sessionId }: TacticalTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTimeline = async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`${backendUrl}/api/timeline?session_id=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
    const interval = setInterval(fetchTimeline, 10000)
    return () => clearInterval(interval)
  }, [backendUrl, sessionId])

  const handleClear = async () => {
    if (!confirm('Purge mission timeline?')) return
    try {
      await fetch(`${backendUrl}/api/timeline?session_id=${sessionId}`, { method: 'DELETE' })
      setEvents([])
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-md border-l border-border w-80 shrink-0 relative overflow-hidden group/timeline">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <History className="size-4 text-primary" />
          <h3 className="text-xs font-black font-mono uppercase tracking-[0.2em]">Mission Timeline</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={fetchTimeline}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={handleClear}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6 relative">
          {/* Vertical Line */}
          <div className="absolute left-[33px] top-6 bottom-6 w-px bg-border/40" />

          {events.length === 0 && !loading && (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
              <Clock className="size-8 text-muted-foreground/20" />
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-8">No tactical events recorded for this session.</p>
            </div>
          )}

          {events.map((event, idx) => {
            const config = EVENT_CONFIG[event.type] || { icon: Clock, color: 'text-muted-foreground' }
            const Icon = config.icon
            
            return (
              <div key={event.id} className="relative pl-10 group/event animate-in fade-in slide-in-from-left-2 duration-300">
                {/* Node */}
                <div className={cn(
                  "absolute left-[27px] top-1.5 size-[13px] rounded-full border-2 border-background z-10 transition-transform group-hover/event:scale-125",
                  config.color.replace('text-', 'bg-')
                )} />
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-black font-mono uppercase tracking-tight", config.color)}>
                      {event.title}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer Status */}
      <div className="p-3 border-t border-border bg-muted/5 flex items-center justify-center gap-2">
        <div className="size-1.5 rounded-full bg-accent animate-pulse" />
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Chronology Synchronized</span>
      </div>

      {/* Subtle overlay scan line */}
      <div className="absolute inset-0 pointer-events-none bg-tactical-grid opacity-[0.01]" />
    </div>
  )
}
