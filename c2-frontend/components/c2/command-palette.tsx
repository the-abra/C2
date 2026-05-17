'use client'

import * as React from 'react'
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Terminal,
  Shield,
  Search,
  Zap,
  FileText,
  History,
  Bot
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
  const { tools, setSelectedToolId, setModalOpen, setTarget } = useC2Store()

  React.useEffect(() => {
    const handlePopulate = (e: any) => {
      const cmd = e.detail
      setOpen(true)
      setInputValue(cmd)
      
      // Smart parsing: If command is "nmap -sV 10.0.0.1", try to find nmap and set target
      const parts = cmd.split(' ')
      if (parts.length > 0) {
        const toolName = parts[0].toLowerCase()
        const tool = tools.find(t => t.name.toLowerCase() === toolName || t.description.toLowerCase().includes(toolName))
        if (tool) setSelectedToolId(tool.id)
        
        // Try to find an IP or domain in the suggested command
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

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search tools..." 
        value={inputValue}
        onValueChange={setInputValue}
      />
      <CommandList className="max-h-[300px]">
        <CommandEmpty>No results found.</CommandEmpty>
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
          <CommandItem onSelect={() => runCommand(() => setModalOpen('history', true))}>
            <History className="mr-2 h-4 w-4" />
            <span>View Operation History</span>
            <CommandShortcut>⌘H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setModalOpen('aIPanel', true))}>
            <Bot className="mr-2 h-4 w-4" />
            <span>Summon AI Analyst</span>
            <CommandShortcut>⌘A</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Configuration">
          <CommandItem onSelect={() => runCommand(() => setModalOpen('aIConfig', true))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>LLM Configuration</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
