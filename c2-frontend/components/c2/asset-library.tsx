'use client'

import { useState, useEffect } from 'react'
import { 
  Database, Search, Target, Globe, Shield, Cpu, 
  ExternalLink, Calendar, Filter, X, Loader2, RefreshCw,
  Clock, Hash, ArrowRight, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useC2Store } from '@/hooks/use-c2-store'

interface Asset {
  session_id: number
  session_name: string
  type: 'domain' | 'ip' | 'service' | 'vuln'
  value: string
  created_at: string
}

interface AssetLibraryProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
}

const TYPE_ICONS: Record<string, any> = {
  domain: Globe,
  ip: Shield,
  service: Cpu,
  vuln: Target,
}

export function AssetLibrary({ isOpen, onClose, backendUrl }: AssetLibraryProps) {
  const store = useC2Store()
  const [assets, setAssets] = useState<Asset[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string | null>(null)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/api/assets/all`)
      if (res.ok) {
        const data = await res.json()
        setAssets(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchAssets()
  }, [isOpen, backendUrl])

  const handleImport = (asset: Asset) => {
    store.setTarget(asset.value)
    onClose()
  }

  const filtered = assets.filter(a => {
    const matchesSearch = a.value.toLowerCase().includes(search.toLowerCase()) || 
                          a.session_name.toLowerCase().includes(search.toLowerCase())
    const matchesType = !filterType || a.type === filterType
    return matchesSearch && matchesType
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[85vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-muted/5">
          <div className="flex items-center gap-5">
            <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
              <Database className="size-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black font-mono tracking-tight uppercase">Global Asset Vault</h2>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em] opacity-60">Cross-Mission Intelligence Archive</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search entities, sessions, metadata..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-11 bg-muted/10 border-border font-mono text-xs uppercase"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted/20 size-11">
              <X className="size-6" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-3 border-b border-border bg-muted/5 flex items-center gap-4">
          <span className="text-[10px] font-black font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Filter className="size-3" /> Filter By:
          </span>
          <div className="flex gap-2">
            {[null, 'domain', 'ip', 'service', 'vuln'].map(type => (
              <button
                key={type || 'all'}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1 rounded-md border font-mono text-[9px] font-bold uppercase transition-all",
                  filterType === type 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {type || 'ALL ASSETS'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4">
             <span className="text-[10px] font-mono text-muted-foreground uppercase">{filtered.length} Entities Indexed</span>
             <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={fetchAssets}>
               <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
             </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex bg-muted/5">
          {/* Main List */}
          <ScrollArea className="flex-1">
            <div className="p-8">
              {loading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-6">
                  <Loader2 className="size-10 text-primary animate-spin" />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Decrypting Asset Database...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center gap-6 border border-dashed border-border rounded-2xl">
                  <Database className="size-16 text-muted-foreground/10" />
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black font-mono text-muted-foreground/40 uppercase tracking-widest">No Intelligence Found</p>
                    <p className="text-[10px] font-mono text-muted-foreground/20 uppercase tracking-widest">Broaden your search parameters or synchronize sessions</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((asset, idx) => {
                    const Icon = TYPE_ICONS[asset.type] || Hash
                    return (
                      <div 
                        key={`${asset.type}-${asset.value}-${idx}`}
                        className="group bg-card border border-border hover:border-primary/40 rounded-xl p-5 transition-all cursor-default relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn(
                            "size-10 rounded-lg flex items-center justify-center border",
                            asset.type === 'vuln' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/10 border-primary/20 text-primary"
                          )}>
                            <Icon className="size-5" />
                          </div>
                          <div className="text-right">
                             <div className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest">Discovered</div>
                             <div className="text-[9px] font-mono text-muted-foreground uppercase">{new Date(asset.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>

                        <div className="space-y-1 mb-6">
                          <div className="text-[9px] font-black font-mono text-primary uppercase tracking-widest opacity-60">{asset.type}</div>
                          <h4 className="text-sm font-black font-mono uppercase truncate text-foreground group-hover:text-primary transition-colors">{asset.value}</h4>
                        </div>

                        <div className="pt-4 border-t border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="size-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold font-mono text-muted-foreground uppercase truncate max-w-[140px]">
                              {asset.session_name}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => handleImport(asset)}
                            title="Import to current session"
                          >
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>

                        {/* Subtle type pattern background */}
                        <div className="absolute -right-4 -top-4 size-24 opacity-[0.03] pointer-events-none rotate-12 group-hover:rotate-0 transition-transform">
                          <Icon className="size-full" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Global Footer */}
        <div className="p-4 border-t border-border bg-muted/5 flex justify-between items-center shrink-0 px-8">
          <div className="flex items-center gap-3">
            <Clock className="size-3.5 text-muted-foreground" />
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Archive Last Synchronized: {new Date().toLocaleTimeString()}</span>
          </div>
          <p className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-[0.3em]">
            Authorized Tactical Asset Intelligence
          </p>
        </div>
      </div>
    </div>
  )
}
