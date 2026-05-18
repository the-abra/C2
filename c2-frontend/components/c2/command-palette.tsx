'use client'

import * as React from 'react'
import {
  Settings, Terminal, Shield, Search, Zap, FileText, History, Target, Trash2, Key
} from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { useC2Store } from '@/hooks/use-c2-store'

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const store = useC2Store()
  const { tools, setSelectedToolId, setModalOpen, setTarget } = store

  React.useEffect(() => {
    const handlePopulate = (e: any) => {
      const cmd = e.detail
      setOpen(true)
      setInputValue(cmd)
      
      const parts = cmd.split(' ')
      if (parts.length > 0) {
        const toolName = parts[0].toLowerCase()
        const tool = tools.find(t => t.name.toLowerCase() === toolName || t.description.toLowerCase().includes(toolName))
        if (tool) setSelectedToolId(tool.id)
        
        const targetPart = parts.find((p: string) => p.includes('.') || p.includes('localhost'))
        if (targetPart) setTarget(targetPart)
      }
    }
    document.addEventListener('populate-command', handlePopulate)
    return () => document.removeEventListener('populate-command', handlePopulate)
  }, [tools, setSelectedToolId, setTarget])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const executeCliCommand = async (cmd: string) => {
    const parts = cmd.trim().split(/\s+/)
    const action = parts[0].toLowerCase()
    
    if (action === '/target' && parts[1]) {
      setTarget(parts[1])
      alert(`[CTF LIGHTSPEED] Scope Target updated: ${parts[1]}`)
      setOpen(false)
      setInputValue('')
      return
    }

    if (action === '/clear') {
      try {
        await fetch(`${store.backendUrl}/api/timeline?session_id=${store.currentSessionId}`, { method: 'DELETE' })
        alert('[CTF LIGHTSPEED] Cleared timeline events.')
      } catch (err) {}
      setOpen(false)
      setInputValue('')
      return
    }

    if (action === '/run' && parts[1]) {
      const binary = parts[1].toLowerCase()
      const tool = tools.find(t => t.default_binary_name === binary || t.name.toLowerCase() === binary)
      if (tool && store.currentSessionId && store.target) {
        const profile = tool.profiles?.[0]
        if (profile) {
          try {
            await fetch(`${store.backendUrl}/api/run`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: store.currentSessionId,
                tool_id: tool.id,
                profile_id: profile.id,
                target: store.target,
                params: {}
              })
            })
            alert(`[CTF LIGHTSPEED] Executed tool: ${tool.name} against ${store.target}`)
          } catch (err) {}
        }
      } else {
        alert(`[CTF ERROR] Scoping failure. Verify target (${store.target || 'None'}) and tool binary name.`)
      }
      setOpen(false)
      setInputValue('')
      return
    }
  }

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  const isCommandMode = inputValue.startsWith('/')

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div onKeyDown={(e) => {
        if (e.key === 'Enter' && isCommandMode) {
          e.preventDefault()
          executeCliCommand(inputValue)
        }
      }}>
        <CommandInput 
          placeholder="Type a command (/run, /target, /clear) or search tools..." 
          value={inputValue}
          onValueChange={setInputValue}
        />
        <CommandList className="max-h-[350px]">
          <CommandEmpty>No results found.</CommandEmpty>
          
          {/* Tactical CTF CLI Autocompletion */}
          {isCommandMode && (
            <CommandGroup heading="Tactical CLI Commands (CTF Keyboard Mode)">
              <CommandItem
                onSelect={() => {
                  setInputValue('/target ')
                }}
                className="flex items-center gap-2 cursor-pointer text-accent"
              >
                <Target className="size-4" />
                <span>/target &lt;host&gt;</span>
                <span className="ml-2 text-[10px] text-muted-foreground">Instantly set target scope</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setInputValue('/run ')
                }}
                className="flex items-center gap-2 cursor-pointer text-accent"
              >
                <Zap className="size-4" />
                <span>/run &lt;binary&gt;</span>
                <span className="ml-2 text-[10px] text-muted-foreground">Engage tool using default profile</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setInputValue('/clear')
                }}
                className="flex items-center gap-2 cursor-pointer text-destructive"
              >
                <Trash2 className="size-4" />
                <span>/clear</span>
                <span className="ml-2 text-[10px] text-muted-foreground">Flush active timeline logs</span>
              </CommandItem>
            </CommandGroup>
          )}

          <CommandSeparator />

          <CommandGroup heading="Tactical Tools">
            {tools.map((tool) => (
              <CommandItem
                key={tool.id}
                onSelect={() => runCommand(() => setSelectedToolId(tool.id))}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Zap className="size-4 text-primary" />
                <span>{tool.name}</span>
                <span className="ml-2 text-[10px] text-muted-foreground opacity-50 truncate">{tool.description}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="System Actions">
            <CommandItem onSelect={() => runCommand(() => setModalOpen('shell', true))}>
              <Terminal className="mr-2 h-4 w-4" />
              <span>Open Interactive Shell</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setModalOpen('missionStudio', true))}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Launch Mission Studio</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setModalOpen('history', true))}>
              <History className="mr-2 h-4 w-4" />
              <span>View Operation History</span>
              <CommandShortcut>⌘H</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Configuration">
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  )
}
