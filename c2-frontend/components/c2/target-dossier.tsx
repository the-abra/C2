'use client'

import React from 'react'
import { 
  Shield, Server, Cpu, Globe, Target, Clock, Activity, 
  ExternalLink, Copy, Terminal, Search, Info, AlertTriangle, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { stripANSI } from '@/lib/utils'
import { type Discovery, fetchNote } from '@/lib/api-service'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface TargetDossierProps {
  entityValue: string
  entityType: string
  discoveries: Discovery[]
  backendUrl: string
  sessionId: number
  noteUpdateTimestamp: number
  onSetTarget: (val: string) => void
  onQuickAction: (tool: string, val: string) => void
  onOpenNotes: () => void
  onClose: () => void
}

export function TargetDossier({
  entityValue,
  entityType,
  discoveries,
  backendUrl,
  sessionId,
  noteUpdateTimestamp,
  onSetTarget,
  onQuickAction,
  onOpenNotes,
  onClose
}: TargetDossierProps) {
  const cleanValue = stripANSI(entityValue)
  const [noteContent, setNoteContent] = React.useState<string>('')
  const [loadingNote, setLoadingNote] = React.useState(false)

  React.useEffect(() => {
    if (!sessionId || !backendUrl || !cleanValue) return
    const getTargetNote = async () => {
      setLoadingNote(true)
      try {
        const data = await fetchNote(backendUrl, sessionId, cleanValue)
        setNoteContent(data?.content || '')
      } catch (e) {
        console.error('Failed to load note', e)
        setNoteContent('')
      } finally {
        setLoadingNote(false)
      }
    }
    getTargetNote()
  }, [backendUrl, sessionId, cleanValue, noteUpdateTimestamp])
  
  // Find all discoveries related to this entity
  // Logic: 
  // 1. Exact matches of this value
  // 2. Discoveries that share the same source_scan_id (finding siblings)
  // 3. For services/vulns, find their parents
  
  const related = React.useMemo(() => {
    const direct = discoveries.filter(d => stripANSI(d.value) === cleanValue)
    const scanIds = new Set(direct.map(d => d.source_scan_id))
    
    // Aggregate all findings from the same scans that found this target
    const context = discoveries.filter(d => scanIds.has(d.source_scan_id))
    
    return {
      ips: context.filter(d => d.type === 'ip'),
      domains: context.filter(d => d.type === 'domain'),
      services: context.filter(d => d.type === 'service'),
      vulns: context.filter(d => d.type === 'vuln'),
    }
  }, [cleanValue, discoveries])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-96 shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
            {entityType === 'vuln' ? <Cpu className="size-4 text-destructive" /> : 
             entityType === 'service' ? <Server className="size-4 text-accent" /> :
             <Shield className="size-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black font-mono uppercase tracking-widest text-foreground truncate">
              {entityType} Dossier
            </h3>
            <p className="text-[10px] font-mono text-muted-foreground truncate">{cleanValue}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="size-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black font-mono uppercase text-muted-foreground/60 tracking-widest border-b border-border pb-1">Tactical Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onSetTarget(cleanValue)}
                className="h-8 font-mono text-[9px] uppercase gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10"
              >
                <Target className="size-3 text-primary" /> Set Target
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(cleanValue)}
                className="h-8 font-mono text-[9px] uppercase gap-2"
              >
                <Copy className="size-3" /> Copy Value
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onQuickAction('nmap', cleanValue)}
                className="h-8 font-mono text-[9px] uppercase gap-2"
              >
                <Search className="size-3" /> Port Scan
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onQuickAction('httpx', cleanValue)}
                className="h-8 font-mono text-[9px] uppercase gap-2"
              >
                <Globe className="size-3" /> HTTP Probe
              </Button>
            </div>
          </div>

          {/* Infrastructure Map */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black font-mono uppercase text-muted-foreground/60 tracking-widest border-b border-border pb-1">Identified Infrastructure</h4>
            
            <div className="space-y-4">
              {/* Domains/IPs */}
              {related.domains.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[9px] font-bold font-mono text-muted-foreground uppercase tracking-tighter">Associated Domains</div>
                  {related.domains.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/10 border border-border/40 font-mono text-[10px]">
                      <span className="truncate">{stripANSI(d.value)}</span>
                      <ExternalLink className="size-2.5 opacity-30" />
                    </div>
                  ))}
                </div>
              )}

              {/* Services */}
              {related.services.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[9px] font-bold font-mono text-muted-foreground uppercase tracking-tighter">Active Services</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {related.services.map((s, i) => {
                       let port = '?'
                       try { if(s.metadata) port = JSON.parse(s.metadata).port || '?' } catch(e){}
                       return (
                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-accent/5 border border-accent/20 group transition-all hover:border-accent/40">
                          <div className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-[9px] font-bold text-accent font-mono">
                            {port}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-mono font-bold truncate">{stripANSI(s.value)}</div>
                          </div>
                          <Terminal className="size-3 text-muted-foreground/30 group-hover:text-accent cursor-pointer" onClick={() => onQuickAction('whatweb', s.value)} />
                        </div>
                       )
                    })}
                  </div>
                </div>
              )}

              {/* Vulnerabilities */}
              {related.vulns.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[9px] font-bold font-mono text-destructive uppercase tracking-tighter">Critical Vulnerabilities</div>
                  <div className="space-y-1.5">
                    {related.vulns.map((v, i) => {
                       let sev = 'UNKNOWN'
                       try { if(v.metadata) sev = JSON.parse(v.metadata).severity || 'UNKNOWN' } catch(e){}
                       return (
                        <div key={i} className="p-2.5 rounded border border-destructive/20 bg-destructive/5 space-y-2 group transition-all hover:border-destructive/40">
                          <div className="flex items-center justify-between gap-2">
                             <span className="text-[10px] font-mono font-black text-destructive truncate uppercase">{stripANSI(v.value)}</span>
                             <Badge variant="outline" className="h-4 px-1 text-[7px] border-destructive/30 text-destructive font-black">{sev}</Badge>
                          </div>
                          <p className="text-[9px] font-mono text-muted-foreground/70 leading-relaxed uppercase">
                            Identified via source scan #{v.source_scan_id}. Verification required.
                          </p>
                        </div>
                       )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Institutional Knowledge */}
          <div className="space-y-3">
             <div className="flex items-center justify-between border-b border-border pb-1">
               <h4 className="text-[10px] font-black font-mono uppercase text-muted-foreground/60 tracking-widest">Expert Notes</h4>
               <Button variant="ghost" size="sm" onClick={onOpenNotes} className="h-5 px-2 text-[9px] font-mono hover:bg-muted/20">
                 Edit Notes
               </Button>
             </div>
             
             <div className="p-3 rounded-lg border border-amber-500/10 bg-amber-500/[0.03] space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="size-3 text-amber-500/50" />
                  <span className="text-[9px] font-mono font-black text-amber-500/80 uppercase">Active Engagement Note</span>
                </div>
                {loadingNote ? (
                  <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest animate-pulse">Loading notes...</p>
                ) : noteContent ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:text-[10px] prose-p:leading-relaxed prose-headings:text-[11px] prose-headings:font-black prose-headings:tracking-widest prose-headings:uppercase prose-pre:bg-background/50 prose-code:text-[9px] prose-code:text-accent">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{noteContent}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-[9px] font-mono text-muted-foreground/70 leading-relaxed uppercase italic">
                    No manual notes recorded for this entity. Click the 'Edit Notes' button to add expert context.
                  </p>
                )}
             </div>
          </div>
          
        </div>
      </ScrollArea>

      {/* Footer Meta */}
      <div className="p-3 border-t border-border bg-muted/5 flex items-center justify-center gap-2">
        <Activity className="size-3 text-primary animate-pulse" />
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-none">Intelligence Dossier v2.0</span>
      </div>
    </div>
  )
}
