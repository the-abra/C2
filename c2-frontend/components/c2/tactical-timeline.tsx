'use client'

import { useState, useEffect } from 'react'
import { 
  History, Clock, Target, Zap, Bot, FileText, CheckCircle2, 
  XCircle, Loader2, Trash2, RefreshCw, ChevronRight, Binary
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, stripANSI } from '@/lib/utils'
import { useC2Store } from '@/hooks/use-c2-store'

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
  const store = useC2Store()
  const selectedScenario = store.scenarios.find(s => s.id === store.selectedScenarioId)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [operatorNote, setOperatorNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

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

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!operatorNote.trim() || submittingNote || !sessionId) return
    setSubmittingNote(true)
    try {
      const res = await fetch(`${backendUrl}/api/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          type: 'note_saved',
          title: 'Operator Entry',
          description: operatorNote.trim(),
          metadata: '{}'
        })
      })
      if (res.ok) {
        setOperatorNote('')
        fetchTimeline()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingNote(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-md border-l border-border w-full relative overflow-hidden group/timeline">
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
          {/* Active Scenario Pipeline Stepper */}
          {selectedScenario && (
            <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 relative z-20">
              <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="size-3.5 text-primary animate-pulse" />
                  <span className="text-[10px] font-black font-mono text-primary uppercase tracking-widest">Active Pipeline</span>
                </div>
                <button
                  onClick={() => store.setSelectedScenarioId(null)}
                  className="text-[9px] font-mono text-muted-foreground/60 hover:text-destructive uppercase tracking-tighter transition-colors"
                >
                  Clear
                </button>
              </div>
              
              <div className="flex items-center gap-1.5 justify-between">
                <div>
                  <h4 className="text-xs font-black font-mono uppercase tracking-tight text-foreground">{selectedScenario.name}</h4>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-tighter mt-0.5 line-clamp-1">{selectedScenario.description}</p>
                </div>
              </div>

              {/* Stepper Pipeline */}
              <div className="pt-2 space-y-2.5">
                {selectedScenario.steps?.map((step, sIdx) => (
                  <div key={step.id || sIdx} className="flex items-center gap-3 font-mono text-[10px]">
                    <div className={cn(
                      "size-5 rounded-full border flex items-center justify-center font-bold text-[9px] shrink-0",
                      sIdx === 0
                        ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : "bg-muted/10 border-border text-muted-foreground"
                    )}>
                      {sIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground truncate uppercase">{step.tool_name || `Step ${sIdx + 1}`}</span>
                        <span className="text-[8px] opacity-40 uppercase tracking-tighter shrink-0">Profile: {step.profile_name || 'Default'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground/60 uppercase">
                        <span>Propagate: {step.auto_propagate_targets ? 'Auto' : 'Off'}</span>
                        <span>•</span>
                        <span>Sync: {step.wait_for_previous ? 'Sync' : 'Async'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      {stripANSI(event.title)}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                    {stripANSI(event.description)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Manual Entry Form */}
      <form onSubmit={handleSubmitNote} className="p-3 border-t border-border bg-[#0a0a0c] flex items-center gap-2">
        <input
          type="text"
          value={operatorNote}
          onChange={(e) => setOperatorNote(e.target.value)}
          disabled={submittingNote}
          placeholder="ENTER OPERATOR NOTE..."
          className="flex-1 bg-transparent border-0 outline-none text-[10px] font-mono uppercase tracking-tight text-foreground placeholder:text-muted-foreground/30 focus:ring-0"
        />
        <Button 
          type="submit" 
          variant="ghost" 
          disabled={!operatorNote.trim() || submittingNote}
          className="h-6 px-2 text-[9px] font-mono hover:bg-accent/15 text-muted-foreground hover:text-accent shrink-0"
        >
          LOG
        </Button>
      </form>

      {/* Footer Status */}
      <div className="p-2 border-t border-border bg-muted/5 flex items-center justify-center gap-2">
        <div className="size-1.5 rounded-full bg-accent animate-pulse" />
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Chronology Synchronized</span>
      </div>

      {/* Subtle overlay scan line */}
      <div className="absolute inset-0 pointer-events-none bg-tactical-grid opacity-[0.01]" />
    </div>
  )
}
