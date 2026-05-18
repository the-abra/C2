'use client'

import { useState } from 'react'
import { ChevronDown, Radar, Globe, Zap, Terminal, Shield, Layout, Settings, FileText, Database, LogOut, Search, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useC2Store } from '@/hooks/use-c2-store'
import { type Category, type Tool } from '@/lib/api-service'

const CATEGORY_ICONS: Record<string, any> = {
  Reconnaissance: Radar,
  'Web Vulnerability': Globe,
  Exploitation: Zap,
  PostExploitation: Shield,
}

interface SidebarProps {
  categories: Category[]
  selectedToolId: number | null
  onSelectTool: (id: number) => void
  processStatus: Record<string, string>
  backendUrl: string
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
  backendUrl,
  onOpenShell,
  onOpenHistory,
  onOpenReport,
  selectedEvidenceCount
}: SidebarProps) {

  const store = useC2Store()
  const [activeView, setActiveView] = useState<'missions' | 'tools'>('missions')
  const [openCategories, setOpenCategories] = useState<string[]>(['Reconnaissance', 'Web Vulnerability', 'Exploitation'])
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedToolIds, setPinnedToolIds] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('pinned-tools') || '[]') } catch { return [] }
  })

  const togglePin = (id: number) => {
    setPinnedToolIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      localStorage.setItem('pinned-tools', JSON.stringify(next))
      return next
    })
  }

  // Flatten all tools from categories for pin lookup
  const allTools = categories.flatMap(c => c.tools || [])

  const getToolCompatibility = (binary: string): { label: string, color: string } => {
    const b = binary.toLowerCase()
    if (['exiftool', 'steghide', 'foremost', 'binwalk'].includes(b)) {
      return { label: 'FILE', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' }
    }
    if (['nmap', 'naabu'].includes(b)) {
      return { label: 'IP', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
    }
    if (['subfinder', 'amass', 'httpx', 'whatweb'].includes(b)) {
      return { label: 'DOM', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' }
    }
    return { label: 'WEB', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
  }

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

      {/* Pinned Tools Quick-Dock */}
      {pinnedToolIds.length > 0 && (
        <div className="px-3 py-2 border-b border-sidebar-border bg-muted/5">
          <div className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-1.5">
            <Star className="size-2 inline mr-1" />Favorites
          </div>
          <div className="flex flex-wrap gap-1">
            {pinnedToolIds.map(id => {
              const tool = allTools.find((t: any) => t.id === id)
              if (!tool) return null
              return (
                <button
                  key={id}
                  onClick={() => onSelectTool(id)}
                  className={cn(
                    "px-2 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wide transition-all border",
                    selectedToolId === id 
                      ? "bg-primary/20 border-primary/40 text-primary" 
                      : "bg-muted/10 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                  )}
                >
                  {tool.default_binary_name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Arsenal Search Bar */}
      {activeView === 'tools' && (
        <div className="px-3 pt-3 pb-1 relative shrink-0">
          <div className="absolute left-6 top-1/2 -translate-y-[calc(50%-4px)] text-muted-foreground/40 pointer-events-none">
            <Search className="size-3.5" />
          </div>
          <input
            type="text"
            placeholder="SEARCH ARSENAL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-4 font-mono text-[9px] bg-muted/5 border border-sidebar-border focus:border-primary/40 rounded transition-all uppercase placeholder:opacity-30 text-foreground"
          />
        </div>
      )}

      {/* Tool Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 space-y-4">
        {activeView === 'missions' ? (
          <div className="space-y-2 px-1">
             {store.scenarios.map(sc => {
               const isCustom = sc.category === 'Custom'
               const stepCount = sc.steps ? sc.steps.length : 0

               return (
                 <div
                   key={sc.id}
                   className={cn(
                     "w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group/item flex flex-col gap-1.5 cursor-pointer",
                     store.selectedScenarioId === sc.id 
                      ? "bg-primary/[0.08] border-primary/40 text-foreground shadow-sm shadow-primary/5" 
                      : "bg-card/30 border-border/40 text-muted-foreground hover:bg-muted/5 hover:border-primary/20 hover:text-foreground"
                   )}
                   onClick={() => store.setSelectedScenarioId(sc.id)}
                 >
                   {/* Badges row */}
                   <div className="flex items-center justify-between gap-2 shrink-0">
                     <span className={cn(
                       "px-1.5 py-0.5 rounded font-mono text-[7px] font-black uppercase tracking-widest leading-none border shrink-0",
                       isCustom 
                         ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                         : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                     )}>
                       {isCustom ? 'Custom' : 'Core'}
                     </span>
                     
                     <div className="flex items-center gap-1.5 ml-auto">
                       <span className="px-1.5 py-0.5 rounded bg-black/40 border border-border/80 font-mono text-[7px] text-muted-foreground font-black uppercase shrink-0">
                         {stepCount} {stepCount === 1 ? 'STAGE' : 'STAGES'}
                       </span>
                       
                       {/* Delete Button for Custom Scenarios */}
                       {isCustom && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation()
                             if (confirm(`Remove custom pipeline "${sc.name}"?`)) {
                               fetch(`${backendUrl}/api/scenarios?id=${sc.id}`, { method: 'DELETE' })
                                 .then(res => {
                                   if (res.ok) {
                                     store.setScenarios(store.scenarios.filter(s => s.id !== sc.id))
                                     if (store.selectedScenarioId === sc.id) {
                                       store.setSelectedScenarioId(null)
                                     }
                                   } else {
                                     alert('Failed to delete scenario from backend database')
                                   }
                                 })
                                 .catch(err => {
                                   console.error(err)
                                   alert('Error connecting to backend to delete scenario')
                                 })
                             }
                           }}
                           className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 rounded transition-all text-muted-foreground"
                           title="Delete custom pipeline"
                         >
                           <Trash2 className="size-3" />
                         </button>
                       )}
                     </div>
                   </div>

                   {/* Title */}
                   <div className="flex items-center gap-2 mt-0.5">
                     <Zap className={cn("size-3.5 shrink-0 transition-colors", store.selectedScenarioId === sc.id ? "text-primary animate-pulse" : "text-primary/40 group-hover/item:text-primary/70")} />
                     <span className="text-xs font-bold font-mono uppercase tracking-tight truncate">{sc.name}</span>
                   </div>

                   {/* Description */}
                   <p className="text-[9px] font-mono leading-relaxed opacity-60 line-clamp-2 pr-1">{sc.description}</p>
                   
                   {/* Left highlight strip */}
                   {store.selectedScenarioId === sc.id && (
                     <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                   )}
                 </div>
               )
             })}
          </div>
        ) : (
          categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.label] || Radar
            
            const filteredTools = cat.tools.filter(t => 
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.default_binary_name.toLowerCase().includes(searchQuery.toLowerCase())
            )

            if (filteredTools.length === 0) return null
            const isOpen = openCategories.includes(cat.label) || searchQuery.trim() !== ''

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
                    {filteredTools.map((tool) => {
                      const comp = getToolCompatibility(tool.default_binary_name)
                      return (
                        <div
                          key={tool.id}
                          onClick={() => onSelectTool(tool.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group relative overflow-hidden text-left font-mono cursor-pointer',
                            selectedToolId === tool.id
                              ? 'bg-primary/[0.08] border-primary/40 text-foreground shadow-sm shadow-primary/5'
                              : 'bg-card/10 border-transparent text-muted-foreground hover:bg-muted/5 hover:border-primary/20 hover:text-foreground'
                          )}
                        >
                          <div className={cn(
                            "size-1.5 rounded-full shrink-0",
                            processStatus[tool.default_binary_name] === 'running' ? "bg-accent animate-pulse" : "bg-muted-foreground/20"
                          )} />
                          
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate text-xs font-bold tracking-tight uppercase">{tool.name}</span>
                            <span className="text-[8px] opacity-40 truncate uppercase tracking-tighter mt-0.5">{tool.description}</span>
                          </div>

                          <span className={cn("ml-auto text-[8px] font-black font-mono px-1.5 py-0.5 rounded border leading-none uppercase tracking-tighter shrink-0", comp.color)}>
                            {comp.label}
                          </span>

                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(tool.id) }}
                            className={cn(
                              "ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0",
                              pinnedToolIds.includes(tool.id) ? "opacity-100 text-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"
                            )}
                          >
                            <Star className={cn("size-3", pinnedToolIds.includes(tool.id) && "fill-current")} />
                          </button>

                          {selectedToolId === tool.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-primary" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* Action Center */}
      <div className="p-3 space-y-2 border-t border-sidebar-border bg-sidebar-accent/10">
        <Button
          onClick={() => store.setModalOpen('missionStudio', true)}
          className="w-full justify-center gap-3 h-10 font-mono text-xs border-primary/30 bg-primary/10 hover:bg-primary/20 text-foreground transition-all shadow-sm group uppercase font-black"
        >
          <Shield className="size-4 text-primary animate-pulse" />
          Mission Studio
        </Button>

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
            onClick={onOpenHistory}
            className="justify-start gap-3 h-10 font-mono text-xs border-sidebar-border bg-sidebar-accent/20 hover:bg-muted transition-all shadow-sm group"
          >
            <Layout className="size-4 text-muted-foreground" />
            History
          </Button>
          <Button
            variant="outline"
            onClick={() => store.addTerminalSession({ 
              id: `shell-${Date.now()}`, 
              title: `Shell ${store.terminalSessions.filter(s => s.type === 'shell').length + 1}`, 
              type: 'shell' 
            })}
            className="justify-start gap-3 h-10 font-mono text-xs border-sidebar-border bg-sidebar-accent/20 hover:bg-primary/10 transition-all shadow-sm group"
          >
            <Terminal className="size-4 text-primary" />
            Terminal
          </Button>
        </div>
      </div>

      {/* Global Status & Switcher */}
      <div className="px-4 py-4 border-t border-sidebar-border bg-sidebar-accent/30 flex flex-col gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            store.setCurrentSessionId(null)
            store.setTarget('')
            store.setSelectedToolId(null)
            store.setSelectedScenarioId(null)
            store.setSelectedProfileId(null)
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
