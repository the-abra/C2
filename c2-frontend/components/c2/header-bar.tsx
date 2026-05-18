'use client'

import { useState, useCallback, useMemo } from 'react'
import { 
  Target, Play, XCircle, FileText, ChevronDown, 
  Settings, Upload, Activity, Shield, Zap, Volume2, VolumeX, Flag
} from 'lucide-react'
import { audioSynth } from '@/lib/audio-synth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useC2Store } from '@/hooks/use-c2-store'
import { runScenario, type AttackProfile } from '@/lib/api-service'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface HeaderBarProps {
  selectedToolName: string
  processStatus: string
  target: string
  onTargetChange: (target: string) => void
  selectedProfile: any
  profiles: any[]
  onProfileChange: (profile: any) => void
  onExecute: () => void
  onCancel: () => void
  onOpenNotes: () => void
  onOpenEvidence: () => void
  onOpenUploads: () => void
  uploads: any[]
  selectedToolCategory?: string
  autoPilotEnabled: boolean
  onToggleAutoPilot: (enabled: boolean) => void
}

export function HeaderBar({
  selectedToolName,
  processStatus,
  target,
  onTargetChange,
  selectedProfile,
  profiles,
  onProfileChange,
  onExecute,
  onCancel,
  onOpenNotes,
  onOpenEvidence,
  onOpenUploads,
  uploads,
  selectedToolCategory,
  autoPilotEnabled,
  onToggleAutoPilot,
}: HeaderBarProps) {
  const { toast } = useToast()
  const store = useC2Store()
  const selectedScenario = store.scenarios.find(s => s.id === store.selectedScenarioId)
  
  const [dragActive, setDragActive] = useState(false)
  const [audioActive, setAudioActive] = useState(audioSynth?.isEnabled() || false)

  const toggleAudio = useCallback(() => {
    if (audioSynth) {
      const next = !audioActive
      audioSynth.setEnabled(next)
      setAudioActive(next)
      toast({
        title: next ? "Tactical Audio Engaged" : "Tactical Audio Muted",
        description: next ? "Web Audio Synthesizer initialized for alert signals." : "Auditory cues disabled."
      })
    }
  }, [audioActive, toast])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const formData = new FormData()
      formData.append('file', file)

      toast({ title: 'Uploading Payload', description: `Transferring ${file.name.toUpperCase()} to target C2...` })

      try {
        const res = await fetch(`${store.backendUrl}/api/uploads`, {
          method: 'POST',
          body: formData
        })
        if (res.ok) {
          onTargetChange(file.name)
          toast({ 
            title: 'Payload Active', 
            description: `Successfully loaded forensic target: ${file.name.toUpperCase()}`
          })
        } else {
          toast({ title: 'Upload Failed', description: 'Failed to transfer payload.', variant: 'destructive' })
        }
      } catch (err: any) {
        toast({ title: 'Upload Error', description: err.message, variant: 'destructive' })
      }
    }
  }, [store.backendUrl, onTargetChange, toast])

  const handleRun = async () => {
    if (store.selectedScenarioId) {
       try {
         await runScenario(store.backendUrl, store.currentSessionId || 0, store.selectedScenarioId, target)
         toast({ title: "Scenario Engaged", description: `Mission '${selectedScenario?.name}' is now active.` })
       } catch (e: any) {
         toast({ title: "Engagement Failed", description: e.message, variant: "destructive" })
       }
    } else {
       onExecute()
    }
  }

  return (
    <header className="h-16 border-b border-border bg-card/30 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-[30]">
      {/* Target Section */}
      {selectedToolCategory === 'Forensics' ? (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex items-center gap-4 flex-1 min-w-0 max-w-2xl animate-in fade-in slide-in-from-left-2 rounded-lg p-1.5 transition-all border",
            dragActive 
              ? "bg-accent/15 border-accent animate-pulse scale-[1.01]" 
              : "border-transparent"
          )}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/15 border border-accent/30 rounded-md shrink-0">
            <Shield className="size-3.5 text-accent animate-pulse" />
            <span className="text-[10px] font-black font-mono text-accent uppercase tracking-widest">
              {dragActive ? 'DROP PAYLOAD!' : 'Forensic File'}
            </span>
          </div>
          <div className="relative flex-1">
            <Select value={target} onValueChange={onTargetChange}>
              <SelectTrigger className="h-10 w-full bg-muted/10 border-border text-[10px] font-mono uppercase pl-4 pr-10 focus:ring-1 focus:ring-accent/40">
                <SelectValue placeholder="SELECT OR DRAG PAYLOAD FILE HERE" />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs max-h-60 bg-background border-border">
                {uploads.length === 0 ? (
                  <div className="p-3 text-center text-muted-foreground text-xs uppercase tracking-tighter">
                    No files uploaded. Drop a file here to upload!
                  </div>
                ) : (
                  uploads.map((file) => (
                    <SelectItem key={file} value={file} className="cursor-pointer">
                      {file.toUpperCase()}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 max-w-xl animate-in fade-in slide-in-from-left-2">
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-primary/60">
              <Target className="size-3.5 mr-2 animate-pulse" />
              <span className="text-[9px] font-black font-mono uppercase tracking-widest mr-2">Target:</span>
            </div>
            <Input
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
              placeholder="IP ADDRESS / DOMAIN / URL"
              className="h-10 pl-20 pr-10 font-mono text-xs bg-muted/10 border-border focus-visible:ring-1 focus-visible:ring-primary/40 transition-all uppercase placeholder:opacity-30"
            />
            {target && (
              <button 
                onClick={() => onTargetChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XCircle className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Workspace Quick-Actions */}
        <div className="flex items-center gap-1 mr-2">
          <Button variant="ghost" size="sm" onClick={onOpenUploads} className="h-10 px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest gap-2">
             <Upload className="size-3.5" />
             Payloads
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenEvidence} className="h-10 px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest gap-2">
             <Activity className="size-3.5" />
             Evidence
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenNotes} className="h-10 px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest gap-2">
             <FileText className="size-3.5" />
             Notes
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-flag-capture'))}
            className="h-10 px-3 font-mono text-[10px] text-green-500/70 hover:text-green-500 uppercase tracking-widest gap-2"
          >
             <Flag className="size-3.5" />
             Flags
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleAudio} 
            className={cn(
              "h-10 px-3 font-mono text-[10px] uppercase tracking-widest gap-2 transition-all",
              audioActive ? "text-accent hover:text-accent/80" : "text-muted-foreground hover:text-foreground"
            )}
          >
             {audioActive ? <Volume2 className="size-3.5 text-accent animate-pulse" /> : <VolumeX className="size-3.5" />}
             {audioActive ? 'AUDIO' : 'MUTE'}
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Execution Actions */}
        <div className="flex items-center gap-1.5 ml-2">
          {store.selectedScenarioId ? (
            <div className="flex flex-col items-end mr-4 animate-in fade-in slide-in-from-right-1">
              <span className="text-[9px] font-black font-mono text-primary uppercase leading-none mb-1">Scenario Chain</span>
              <span className="text-[10px] font-mono text-foreground uppercase truncate max-w-[150px] font-bold">{selectedScenario?.name}</span>
            </div>
          ) : (
            <Select value={selectedProfile?.id.toString()} onValueChange={(v) => onProfileChange(profiles.find(p => p.id.toString() === v)!)}>
              <SelectTrigger className="w-[180px] h-10 bg-muted/10 border-border text-[10px] font-mono uppercase">
                <SelectValue placeholder="Attack Profile" />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="w-px h-6 bg-border mx-1" />

          {processStatus === 'running' ? (
            <Button 
              variant="destructive" 
              onClick={onCancel}
              className="h-10 px-4 font-bold font-mono text-xs uppercase"
            >
              <XCircle className="size-4 mr-2" /> Abort
            </Button>
          ) : (
            <Button 
              onClick={handleRun}
              disabled={!target.trim() || (!selectedProfile && !store.selectedScenarioId)}
              className="h-10 px-6 font-black font-mono text-xs uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all group"
            >
              <Play className="size-4 mr-2 fill-current group-hover:scale-110 transition-transform" /> 
              Engage
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
