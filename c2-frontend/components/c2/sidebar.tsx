'use client'

import { useState } from 'react'
import { ChevronDown, Radar, Globe, Zap, Terminal, Shield, Bot, Layout, Settings, FileText, Database, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useC2Store } from '@/hooks/use-c2-store'

const CATEGORY_ICONS: Record<string, any> = {
  Reconnaissance: Radar,
  'Web Vulnerability': Globe,
  Exploitation: Zap,
  PostExploitation: Shield,
}

interface SidebarProps {
  categories: { label: string; tools: any[] }[]
  selectedToolId: number | null
  onSelectTool: (id: number) => void
  processStatus: Record<string, any>
  backendUrl: string
  onOpenAI: () => void
  onOpenShell: () => void
  onOpenHistory: () => void
  onOpenReport: () => void
  selectedEvidenceCount: number
}

export function Sidebar({
  categories,
  selectedToolId,
  onSelectTool,
  processStatus,
  onOpenAI,
  onOpenShell,
  onOpenHistory,
  onOpenReport,
  selectedEvidenceCount
}: SidebarProps) {
  const store = useC2Store()
  const [activeView, setActiveView] = useState<'missions' | 'tools'>('missions')
  const [openCategories, setOpenCategories] = useState<string[]>(['Reconnaissance', 'Web Vulnerability', 'Exploitation'])

  const toggleCategory = (label: string) => {
    setOpenCategories((prev: string[]) =>
      prev.includes(label) ? prev.filter((c: string) => c !== label) : [...prev, label]
    )
  }

  return (
    <aside className="w-full h-full border-r border-sidebar-border bg-sidebar flex flex-col shrink-0 relative z-[20]">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-sidebar-border bg-sidebar-accent/30">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center shadow-inner">
            <Shield className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-black font-mono tracking-tighter text-sidebar-foreground uppercase">Duelist C2</h1>
            <p className="text-[8px] font-mono text-muted-foreground/60 uppercase tracking-[0.2em] -mt-0.5">Mission Controller</p>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex p-2 bg-muted/5 border-b border-sidebar-border">
        <button 
          onClick={() => setActiveView('missions')}
          className={cn(
            "flex-1 py-1.5 rounded font-mono text-[9px] font-black uppercase tracking-widest transition-all",
            activeView === 'missions' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Missions
        </button>
        <button 
          onClick={() => setActiveView('tools')}
          className={cn(
            "flex-1 py-1.5 rounded font-mono text-[9px] font-black uppercase tracking-widest transition-all",
            activeView === 'tools' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Arsenal
        </button>
      </div>

      {/* Tool Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 space-y-4">
        {activeView === 'missions' ? (
          <div className="space-y-1">
             {store.scenarios.map(sc => (
               <button
                 key={sc.id}
                 onClick={() => store.setSelectedScenarioId(sc.id)}
                 className={cn(
                   "w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden group",
                   store.selectedScenarioId === sc.id 
                    ? "bg-primary/10 border-primary/40 text-foreground" 
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/5 hover:text-foreground"
                 )}
               >
                 <div className="flex items-center gap-2 mb-1">
                    <Zap className={cn("size-3.5 transition-colors", store.selectedScenarioId === sc.id ? "text-primary" : "text-primary/40 group-hover:text-primary/70")} />
                    <span className="text-xs font-black font-mono uppercase tracking-tighter">{sc.name}</span>
                 </div>
                 <p className="text-[9px] font-mono leading-tight opacity-50 line-clamp-2">{sc.description}</p>
                 
                 {store.selectedScenarioId === sc.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                 )}
               </button>
             ))}
          </div>
        ) : (
          categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.label] || Radar
            const isOpen = openCategories.includes(cat.label)

            return (
              <div key={cat.label} className="space-y-1">
                <button
                  onClick={() => toggleCategory(cat.label)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest hover:text-sidebar-foreground transition-colors group"
                >
                  <Icon className="size-3 text-primary/60 group-hover:text-primary" />
                  {cat.label}
                  <ChevronDown className={cn("size-3 ml-auto transition-transform duration-300", isOpen ? "rotate-0" : "-rotate-90")} />
                </button>

                {isOpen && (
                  <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {cat.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-all group relative overflow-hidden',
                          selectedToolId === tool.id
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                      >
                        <div className={cn(
                          "size-1.5 rounded-full shrink-0",
                          processStatus[tool.default_binary_name] === 'running' ? "bg-accent animate-pulse" : "bg-muted-foreground/20"
                        )} />
                        <span className="truncate">{tool.name}</span>
                        
                        {selectedToolId === tool.id && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* Action Center */}
      <div className="p-3 space-y-2 border-t border-sidebar-border bg-sidebar-accent/10">
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            onClick={onOpenReport}
            className="justify-start gap-3 h-10 font-mono text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all shadow-sm group"
          >
            <FileText className="size-4 text-primary group-hover:animate-subtle-pulse" />
            Briefing
          </Button>
          <Button
            variant="outline"
            onClick={() => store.setModalOpen('assetLibrary', true)}
            className="justify-start gap-3 h-10 font-mono text-xs border-sidebar-border bg-sidebar-accent/20 hover:bg-muted transition-all shadow-sm group"
          >
            <Database className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            Vault
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            onClick={() => store.setModalOpen('automationCenter', true)}
            className="justify-start gap-3 h-10 font-mono text-xs border-accent/20 bg-accent/5 hover:bg-accent/10 transition-all shadow-sm group"
          >
            <Zap className="size-4 text-accent group-hover:animate-pulse" />
            Auto-Pilot
          </Button>
          <Button
            variant="outline"
            onClick={onOpenHistory}
            className="justify-start gap-3 h-10 font-mono text-xs border-sidebar-border bg-sidebar-accent/20 hover:bg-muted transition-all shadow-sm"
          >
            <Layout className="size-4 text-muted-foreground" />
            History
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="outline"
            onClick={() => store.addTerminalSession({ 
              id: `shell-${Date.now()}`, 
              title: `Shell ${store.terminalSessions.filter(s => s.type === 'shell').length + 1}`, 
              type: 'shell' 
            })}
            className="justify-start gap-3 h-10 font-mono text-xs border-sidebar-border bg-sidebar-accent/20 hover:bg-primary/10 transition-all shadow-sm"
          >
            <Terminal className="size-4 text-primary" />
            Terminal
          </Button>
          <Button
            variant="outline"
            onClick={onOpenAI}
            className="justify-start gap-3 h-10 font-mono text-xs border-sidebar-border bg-sidebar-accent/20 hover:bg-accent/10 transition-all shadow-sm"
          >
            <Bot className="size-4 text-accent" />
            AI Chat
          </Button>
        </div>
      </div>

      {/* Global Status & Switcher */}
      <div className="px-4 py-4 border-t border-sidebar-border bg-sidebar-accent/30 flex flex-col gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (confirm('Exit current mission and return to session selection?')) {
              store.setCurrentSessionId(null)
            }
          }}
          className="w-full justify-start gap-3 h-10 font-mono text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all uppercase tracking-widest"
        >
          <LogOut className="size-3.5" />
          Switch Mission
        </Button>

        <div className="flex items-center gap-2 px-2 py-1">
          <Shield className="size-3.5 text-primary opacity-70" />
          <span className="text-[10px] font-bold font-mono text-muted-foreground tracking-tighter uppercase truncate">
            {store.backendUrl.replace('http://', '')}
          </span>
        </div>
      </div>
    </aside>
  )
}
