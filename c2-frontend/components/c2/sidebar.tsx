'use client'

import { useState } from 'react'
import { ChevronDown, Radar, Globe, Zap, Terminal, Shield, Bot, Layout } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const CATEGORY_ICONS: Record<string, any> = {
  Reconnaissance: Radar,
  'Web Vulnerability': Globe,
  Exploitation: Zap,
  OSINT: Shield,
}

export interface Tool {
  id: number
  name: string
  description: string
  is_installed?: boolean
  profiles?: any[]
}

export interface Category {
  label: string
  tools: Tool[]
}

interface SidebarProps {
  categories: Category[]
  selectedToolId: number | string | null
  onSelectTool: (id: number) => void
  processStatus: string
  backendUrl: string
  onOpenAI: () => void
  onOpenShell: () => void
  selectedEvidenceCount: number
}

export function Sidebar({ 
  categories, 
  selectedToolId, 
  onSelectTool, 
  processStatus, 
  backendUrl, 
  onOpenAI,
  onOpenShell,
  selectedEvidenceCount
}: SidebarProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(['Reconnaissance', 'Web Vulnerability', 'Exploitation'])

  const toggleCategory = (label: string) => {
    setOpenCategories((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    )
  }

  return (
    <aside className="flex flex-col w-64 min-w-[240px] h-full bg-sidebar border-r border-sidebar-border shadow-xl">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border bg-muted/20">
        <div className="flex items-center justify-center size-9 rounded bg-primary/10 border border-primary/20 shadow-inner">
          <Shield className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold font-mono text-foreground leading-none tracking-tight">C2 COMMAND</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-tighter uppercase opacity-70">Tactical Backend v1.0</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-sidebar-border bg-background/50">
        <span className={cn('size-2 rounded-full', processStatus === 'running' ? 'bg-accent animate-pulse' : 'bg-primary/40')} />
        <span className="text-[10px] font-mono text-muted-foreground truncate opacity-80">{backendUrl}</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.label] || Layout
          const isOpen = openCategories.includes(cat.label)

          return (
            <div key={cat.label} className="mb-2">
              <button
                onClick={() => toggleCategory(cat.label)}
                className="flex items-center w-full gap-2.5 px-3 py-2 text-left group hover:bg-sidebar-accent/40 rounded-md transition-all"
              >
                <Icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="flex-1 text-[11px] font-bold font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground">
                  {cat.label}
                </span>
                <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', isOpen ? 'rotate-0' : '-rotate-90')} />
              </button>

              {isOpen && (
                <ul className="mt-1 ml-2 space-y-1">
                  {cat.tools.map((tool) => {
                    const isActive = selectedToolId === tool.id
                    const isInstalled = tool.is_installed !== false
                    return (
                      <li key={tool.id}>
                        <button
                          disabled={!isInstalled}
                          onClick={() => onSelectTool(tool.id)}
                          className={cn(
                            'flex flex-col w-full px-3 py-2 rounded-md border text-left transition-all',
                            !isInstalled ? 'text-red-900 cursor-not-allowed opacity-75 border-transparent' :
                            isActive 
                              ? 'bg-primary/10 border-primary/30 shadow-sm' 
                              : 'border-transparent hover:bg-sidebar-accent/60'
                          )}
                        >
                          <div className={cn('text-xs font-bold font-mono', !isInstalled ? 'text-red-900' : isActive ? 'text-foreground' : 'text-sidebar-foreground')}>
                            {tool.name}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate opacity-70">
                            {tool.description}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>

      <div className="p-3 space-y-2 border-t border-sidebar-border bg-muted/10">
        <Button
          variant="outline"
          onClick={onOpenAI}
          className="w-full justify-start gap-3 h-10 font-mono text-xs border-border/50 bg-background/50 hover:bg-accent/10 transition-all shadow-sm relative overflow-hidden"
        >
          <Bot className="size-4 text-accent" />
          AI Intelligence
          {selectedEvidenceCount > 0 && (
            <span className="ml-auto bg-accent/20 text-accent border border-accent/30 px-1.5 py-0.5 rounded text-[9px]">
              {selectedEvidenceCount} Files
            </span>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={onOpenShell}
          className="w-full justify-start gap-3 h-10 font-mono text-xs border-border/50 bg-background/50 hover:bg-primary/10 transition-all shadow-sm"
        >
          <Terminal className="size-4 text-primary" />
          Live Terminal
        </Button>
      </div>

      <div className="px-4 py-4 border-t border-sidebar-border bg-sidebar-accent/20">
        <div className="flex items-center gap-2.5">
          <Terminal className="size-3.5 text-primary opacity-70" />
          <span className="text-[10px] font-bold font-mono text-muted-foreground tracking-tighter">
            SECURE LINK ACTIVE
          </span>
        </div>
      </div>
    </aside>
  )
}
