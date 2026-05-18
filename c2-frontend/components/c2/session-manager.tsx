'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Layout, Target, Calendar, ArrowRight, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useC2Store } from '@/hooks/use-c2-store'
import { fetchSessions, createSession, deleteSession, type Session } from '@/lib/api-service'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export function SessionManager() {
  const { toast } = useToast()
  const { backendUrl, setCurrentSessionId, setSessions, sessions } = useC2Store()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')

  const loadSessions = async () => {
    setLoading(true)
    try {
      const data = await fetchSessions(backendUrl)
      setSessions(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [backendUrl])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createSession(backendUrl, newName, newTarget)
      setNewName('')
      setNewTarget('')
      toast({
        title: '✓ Session Initialized',
        description: `Operation "${newName}" created successfully.`
      })
      await loadSessions()
    } catch (e: any) {
      console.error(e)
      toast({
        title: 'Initialization Failed',
        description: e.message || 'Make sure the session name is unique and the backend is online.',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this session and all its tactical data?')) return
    try {
      await deleteSession(backendUrl, id)
      toast({
        title: '✓ Session Deleted',
        description: 'The session archive was permanently deleted.'
      })
      await loadSessions()
    } catch (e: any) {
      console.error(e)
      toast({
        title: 'Deletion Failed',
        description: e.message || 'Could not delete the session.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[600] bg-background flex items-center justify-center p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-tactical-grid opacity-[0.03] pointer-events-none" />
      
      <div className="w-full max-w-4xl space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="size-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl">
            <Shield className="size-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black font-mono tracking-tighter uppercase">Command & Control Sessions</h1>
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest opacity-60">Initialize mission workspace or resume operation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create New Session */}
          <div className="md:col-span-1 bg-card border border-border rounded-xl p-6 shadow-xl flex flex-col space-y-6">
            <div className="space-y-2">
              <h2 className="text-sm font-bold font-mono uppercase tracking-widest flex items-center gap-2">
                <Plus className="size-4 text-primary" /> New Operation
              </h2>
              <div className="h-px bg-border w-full" />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">Session Name</label>
                <Input 
                  placeholder="OP-VALKYRIE-01" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-background border-border font-mono text-xs uppercase"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">Default Target (Optional)</label>
                <Input 
                  placeholder="10.0.0.1 / example.com" 
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="bg-background border-border font-mono text-xs"
                />
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={creating || !newName.trim()} 
                className="w-full font-mono font-bold uppercase text-xs h-11 bg-primary hover:bg-primary/90"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : "Initialize Session"}
              </Button>
            </div>
          </div>

          {/* Session List */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold font-mono uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                <Layout className="size-4" /> Active Archive
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground/40 uppercase font-bold">{(sessions || []).length} Sessions Found</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-card/30 border border-dashed border-border rounded-xl">
                  <Loader2 className="size-8 text-primary/40 animate-spin" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Synchronizing Active Archive...</p>
                </div>
              ) : (sessions || []).length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-card/30 border border-dashed border-border rounded-xl">
                  <Layout className="size-12 text-muted-foreground/20" />
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest opacity-40">Archive Empty. Initialize first session to begin.</p>
                </div>
              ) : (
                (sessions || []).map((s: Session) => (
                  <div 
                    key={s.id}
                    onClick={() => {
                      setCurrentSessionId(s.id)
                      // Pre-fill target if it exists, otherwise clear the store target
                      if (s.target) {
                        useC2Store.getState().setTarget(s.target)
                      } else {
                        useC2Store.getState().setTarget('')
                      }
                    }}
                    className="group bg-card hover:bg-secondary/50 border border-border hover:border-primary/40 p-4 rounded-xl transition-all cursor-pointer flex items-center gap-4 relative overflow-hidden"
                  >
                    <div className="size-10 rounded bg-muted flex items-center justify-center shrink-0 border border-border group-hover:border-primary/20">
                      <Target className={cn("size-5 transition-colors", s.target ? "text-primary" : "text-muted-foreground/40")} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold font-mono uppercase tracking-tight truncate group-hover:text-primary transition-colors">{s.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 uppercase truncate max-w-[200px]">
                          <Target className="size-3" /> {s.target || "UNSPECIFIED TARGET"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5 uppercase">
                          <Calendar className="size-3" /> {new Date(s.last_accessed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => handleDelete(s.id, e)}
                        className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <div className="size-9 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        <ArrowRight className="size-5 translate-x-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Subtle activity indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono text-muted-foreground/30 uppercase tracking-[0.3em] pt-8">
          Authorized Personnel Only — Unified Tactical Interface
        </p>
      </div>
    </div>
  )
}
