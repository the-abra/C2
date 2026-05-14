'use client'

import { Target, Zap, Play, Square, FileText, ChevronDown, HardDrive, File } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type AttackProfile } from '@/lib/api-service'
import { cn } from '@/lib/utils'

interface HeaderBarProps {
  selectedToolName: string
  processStatus: string
  target: string
  onTargetChange: (v: string) => void
  selectedProfile?: AttackProfile
  profiles: AttackProfile[]
  onProfileChange: (p: AttackProfile) => void
  onExecute: () => void
  onCancel: () => void
  onOpenNotes: () => void
  onOpenEvidence: () => void
  onOpenUploads: () => void
  uploads: string[]
  selectedToolCategory?: string
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
}: HeaderBarProps) {
  const isRunning = processStatus === 'running'
  const isFileBased = selectedToolCategory === 'Forensics'

  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-muted/20 border-b border-border h-20 shadow-sm shrink-0">
      {/* Target Selection */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-md px-3 h-10 w-96 shadow-inner group focus-within:border-primary/50 transition-all">
        {isFileBased ? (
          <File className="size-4 text-blue-400 group-focus-within:text-primary transition-colors shrink-0" />
        ) : (
          <Target className="size-4 text-muted-foreground group-focus-within:text-primary transition-colors shrink-0" />
        )}
        
        {isFileBased ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-1 text-left font-mono text-xs text-zinc-300 truncate outline-none">
                {target || "SELECT UPLOADED FILE"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 font-mono text-xs z-[200] bg-popover border-border shadow-2xl">
              {uploads.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 italic">No files uploaded. Use File Manager.</div>
              ) : (
                uploads.map((file) => (
                  <DropdownMenuItem
                    key={file}
                    onClick={() => onTargetChange(file)}
                    className="cursor-pointer hover:bg-accent/10"
                  >
                    {file}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Input
            value={target}
            onChange={(e) => onTargetChange(e.target.value)}
            placeholder="TARGET IP / DOMAIN"
            className="h-8 border-none bg-transparent font-mono text-xs focus-visible:ring-0 placeholder:opacity-50"
          />
        )}
      </div>

      {/* Profile Selection */}
      <div className="flex-1 max-w-md">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-10 font-mono text-xs border-border bg-card shadow-sm hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 truncate">
                <Zap className="size-3.5 text-accent" />
                <span className="text-muted-foreground">Profile:</span>
                <span className="text-foreground truncate font-bold">{selectedProfile?.name || 'Select Profile'}</span>
              </div>
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 font-mono text-xs z-[200] bg-popover border-border shadow-2xl">
            {profiles.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onProfileChange(p)}
                className="cursor-pointer hover:bg-accent/10"
              >
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenUploads}
          title="Tactical File Manager"
          className="h-10 w-10 border-border bg-card hover:bg-muted"
        >
          <HardDrive className="size-4 text-blue-400" />
        </Button>
        <Button
          variant="outline"
          onClick={onOpenEvidence}
          className="h-10 px-4 gap-2 font-mono text-xs border-border bg-card hover:bg-muted"
        >
          <FileText className="size-4 text-muted-foreground" />
          Evidence
        </Button>
        <Button
          variant="outline"
          onClick={onOpenNotes}
          className="h-10 px-4 gap-2 font-mono text-xs border-border bg-card hover:bg-muted"
        >
          <FileText className="size-4 text-muted-foreground" />
          Notes
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        {isRunning ? (
          <Button
            variant="destructive"
            onClick={onCancel}
            className="h-10 px-6 gap-2 font-mono text-xs shadow-lg shadow-destructive/20 animate-pulse"
          >
            <Square className="size-4 fill-current" />
            Kill Process
          </Button>
        ) : (
          <Button
            onClick={onExecute}
            disabled={!target.trim() || !selectedToolName || !selectedProfile}
            className="h-10 px-8 gap-2 font-mono text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Play className="size-4 fill-current" />
            Engage Duelist
          </Button>
        )}
      </div>
    </header>
  )
}
