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
  parameters: string[] // List of keys like WORDLIST, PORTS
  onConfirm: (values: Record<string, string>) => void
}

export function ParameterPrompt({
  isOpen,
  onClose,
  title,
  description,
  parameters,
  onConfirm
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

           <div className="space-y-4">
              {parameters.map(param => (
                <div key={param} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black font-mono uppercase tracking-widest text-muted-foreground">{param}</label>
                    <span className="text-[8px] font-mono text-primary/40 uppercase">Required</span>
                  </div>
                  <Input 
                    value={values[param] || ''} 
                    onChange={e => setValues(prev => ({ ...prev, [param]: e.target.value }))}
                    placeholder={`Enter ${param.toLowerCase()}...`}
                    className="h-10 font-mono text-xs bg-muted/5 border-border focus-visible:ring-1 focus-visible:ring-primary/40"
                  />
                </div>
              ))}
           </div>
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
