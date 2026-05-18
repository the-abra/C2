'use client'

import { useState, useEffect } from 'react'
import { 
  Settings2, X, Play, Loader2, Info, Terminal, Layout
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ParameterPromptProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  rationale?: string
  parameters: string[] // List of keys like WORDLIST, PORTS
  onConfirm: (values: Record<string, string>) => void
  binaryName?: string
  profileArgs?: string[]
  target?: string
}

export function ParameterPrompt({
  isOpen,
  onClose,
  title,
  description,
  rationale,
  parameters,
  onConfirm,
  binaryName,
  profileArgs,
  target
}: ParameterPromptProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  // Initialize values
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {}
      parameters.forEach(p => {
        // Some defaults based on common names
        if (p === 'WORDLIST') initial[p] = '/usr/share/wordlists/dirb/common.txt'
        else if (p === 'THREADS') initial[p] = '10'
        else initial[p] = ''
      })
      setValues(initial)
    }
  }, [isOpen, parameters])

  const handleConfirm = () => {
    onConfirm(values)
    onClose()
  }

  const getCommandLine = () => {
    if (!binaryName) return ''
    let cmd = binaryName
    if (profileArgs && profileArgs.length > 0) {
      profileArgs.forEach(arg => {
        let replaced = arg
        replaced = replaced.replace(/{{TARGET}}/g, target || '127.0.0.1')
        parameters.forEach(p => {
          const val = values[p] || `[${p}]`
          const regex = new RegExp(`{{${p}}}`, 'g')
          replaced = replaced.replace(regex, val)
        })
        cmd += ` ${replaced}`
      })
    } else {
      cmd += ` ${target || '127.0.0.1'}`
    }
    return cmd
  }

  const isComplete = parameters.every(p => values[p]?.trim() !== '')

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-border text-foreground">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
               <Settings2 className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-black font-mono uppercase tracking-tight">Mission Parameters</DialogTitle>
              <DialogDescription className="text-[10px] font-mono uppercase tracking-widest opacity-60">Required Variables for Engagement</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-5">
           <div className="space-y-1 px-1">
              <h4 className="text-[11px] font-black font-mono uppercase text-primary">{title}</h4>
              <p className="text-[10px] font-mono text-muted-foreground leading-tight italic">{description}</p>
           </div>

           {rationale && (
              <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.03] p-3 space-y-1.5 flex items-start gap-2.5">
                <Info className="size-4 text-amber-500/50 mt-0.5" />
                <div>
                  <h5 className="font-mono text-[10px] font-black uppercase tracking-widest text-amber-500/80">Expert Rationale</h5>
                  <p className="font-mono text-[9px] text-muted-foreground/70 leading-relaxed uppercase mt-1">
                    {rationale}
                  </p>
                </div>
              </div>
           )}

            <div className="space-y-4">
              {parameters.map(param => {
                const isWordlist = param.toLowerCase().includes('wordlist');
                const isThreads = param.toLowerCase().includes('threads');
                const isPorts = param.toLowerCase().includes('ports');

                return (
                  <div key={param} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black font-mono uppercase tracking-widest text-muted-foreground">{param}</label>
                      <span className="text-[8px] font-mono text-primary/40 uppercase">Required</span>
                    </div>

                    {isWordlist ? (
                      <div className="relative">
                        <select
                          value={values[param] || ''}
                          onChange={e => setValues(prev => ({ ...prev, [param]: e.target.value }))}
                          className="w-full h-10 px-3 font-mono text-xs bg-muted/10 border border-border rounded focus:outline-none focus:border-primary/40 text-foreground"
                        >
                          <option value="" className="bg-background text-muted-foreground/30" disabled>SELECT TACTICAL DICTIONARY</option>
                          <option value="/usr/share/wordlists/dirb/common.txt" className="bg-background">DIRB - COMMON.TXT (STEALTH)</option>
                          <option value="/usr/share/wordlists/dirb/small.txt" className="bg-background">DIRB - SMALL.TXT (RAPID)</option>
                          <option value="/usr/share/wordlists/rockyou.txt" className="bg-background">ROCKYOU.TXT (BRUTEFORCE)</option>
                          <option value="/usr/share/wordlists/dnsmap.txt" className="bg-background">DNSMAP.TXT (DOMAINS)</option>
                        </select>
                      </div>
                    ) : isThreads ? (
                      <div className="space-y-2 bg-muted/5 border border-border/40 p-3 rounded-lg">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-accent font-black uppercase tracking-wider">STEALTH LIMITER</span>
                          <span className="font-bold text-accent">{values[param] || '10'} THREADS</span>
                        </div>
                        <input 
                          type="range"
                          min="1"
                          max="100"
                          value={values[param] || '10'}
                          onChange={e => setValues(prev => ({ ...prev, [param]: e.target.value }))}
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                      </div>
                    ) : isPorts ? (
                      <div className="space-y-2">
                        <Input 
                          value={values[param] || ''} 
                          onChange={e => setValues(prev => ({ ...prev, [param]: e.target.value }))}
                          placeholder="80,443,8080..."
                          className="h-10 font-mono text-xs bg-muted/5 border-border focus-visible:ring-1 focus-visible:ring-primary/40"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {[
                            { label: 'TOP 100', val: '80,443,22,21,25,3306,8080' },
                            { label: 'WEB ONLY', val: '80,443,8080,8443' },
                            { label: 'FULL 65K', val: '1-65535' }
                          ].map(chip => (
                            <button
                              type="button"
                              key={chip.label}
                              onClick={() => setValues(prev => ({ ...prev, [param]: chip.val }))}
                              className="px-2 py-0.5 rounded border border-border hover:border-primary/50 bg-muted/5 hover:bg-primary/5 text-[8px] font-black font-mono text-muted-foreground hover:text-primary transition-all uppercase tracking-tighter"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Input 
                        value={values[param] || ''} 
                        onChange={e => setValues(prev => ({ ...prev, [param]: e.target.value }))}
                        placeholder={`Enter ${param.toLowerCase()}...`}
                        className="h-10 font-mono text-xs bg-muted/5 border-border focus-visible:ring-1 focus-visible:ring-primary/40"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {binaryName && (
              <div className="mt-4 p-3 rounded-lg bg-black/90 border border-primary/20 font-mono text-[10px] text-primary select-all">
                <span className="text-[8px] text-muted-foreground block mb-1 uppercase tracking-widest font-black">TACTICAL ENGAGEMENT CLI PREVIEW:</span>
                <span className="text-foreground">$ </span>{getCommandLine()}
              </div>
            )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" className="flex-1 font-mono text-xs uppercase" onClick={onClose}>Abort</Button>
          <Button 
            className="flex-1 font-black font-mono text-xs uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            onClick={handleConfirm}
            disabled={!isComplete}
          >
            <Play className="size-3.5 mr-2 fill-current" /> Engage Mission
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
