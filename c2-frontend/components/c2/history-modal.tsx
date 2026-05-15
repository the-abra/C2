'use client'

import { useState, useEffect } from 'react'
import { History, Search, ExternalLink, Trash2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ScanEntry {
  id: number
  tool_name: string
  target: string
  start_time: string
  end_time: string | null
  status: 'running' | 'completed' | 'killed' | 'failed'
  log_file_path: string
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
}

export function HistoryModal({ isOpen, onClose, backendUrl }: HistoryModalProps) {
  const [history, setHistory] = useState<ScanEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/api/history`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) fetchHistory()
  }, [isOpen])

  const filtered = history.filter(h => 
    h.tool_name.toLowerCase().includes(search.toLowerCase()) ||
    h.target.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="size-3.5 text-green-400" />
      case 'failed': return <XCircle className="size-3.5 text-red-400" />
      case 'running': return <Clock className="size-3.5 text-blue-400 animate-pulse" />
      case 'killed': return <AlertCircle className="size-3.5 text-zinc-500" />
      default: return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[35vw] max-w-none h-[80vh] flex flex-col bg-[#080809] border-white/5 p-0 overflow-hidden shadow-2xl z-[300]">
        <DialogHeader className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-primary/10 border border-primary/20">
                <History className="size-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black font-mono tracking-widest uppercase">Operation History</DialogTitle>
                <p className="text-[10px] font-mono text-zinc-500 tracking-tight uppercase opacity-60">Log tracking & status archive</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-[200px]">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                <Input 
                  placeholder="Filter by tool or target..." 
                  className="h-8 pl-8 bg-black/40 border-white/5 text-[11px] font-mono"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading} className="h-8 font-mono text-[10px] border-white/5 hover:bg-white/5">
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <table className="w-full text-left border-separate border-spacing-y-1.5">
              <thead>
                <tr className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  <th className="px-4 py-2 font-medium w-[80px]">Status</th>
                  <th className="px-4 py-2 font-medium">Tool</th>
                  <th className="px-4 py-2 font-medium">Target</th>
                  <th className="px-4 py-2 font-medium text-right w-[60px]">Link</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-mono">
                {filtered.map((h) => (
                  <tr key={h.id} className="group hover:bg-white/[0.03] transition-colors rounded-lg overflow-hidden border border-transparent hover:border-white/5">
                    <td className="px-4 py-3 rounded-l-lg bg-white/[0.01]">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(h.status)}
                        <span className="uppercase text-[9px] font-bold">{h.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 bg-white/[0.01]">
                      <span className="text-primary font-bold">{h.tool_name}</span>
                    </td>
                    <td className="px-4 py-3 bg-white/[0.01] max-w-[120px] truncate">
                      <span className="text-zinc-300">{h.target}</span>
                      <p className="text-[9px] text-zinc-600 mt-0.5">{new Date(h.start_time).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-4 py-3 rounded-r-lg bg-white/[0.01] text-right">
                      <Button variant="ghost" size="sm" className="size-8 p-0 hover:bg-primary/20 hover:text-primary">
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600 font-mono">
                <History className="size-8 opacity-20 mb-4" />
                <p className="text-xs uppercase tracking-widest opacity-50">No operations found in archive</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
