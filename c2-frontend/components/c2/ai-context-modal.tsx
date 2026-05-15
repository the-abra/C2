'use client'

import React, { useState, useEffect } from 'react'
import { Folder, FileText, Check, Search, X, Shield, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

interface FileNode {
  name: string
}

type FileTree = Record<string, FileNode[]>

interface AIContextModalProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
  selectedFiles: { target: string; filename: string }[]
  onToggleFile: (target: string, filename: string) => void
}

export function AIContextModal({ isOpen, onClose, backendUrl, selectedFiles, onToggleFile }: AIContextModalProps) {
  const [tree, setTree] = useState<FileTree>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchTree = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${backendUrl}/api/files/tree`)
      if (res.ok) {
        const data = await res.json()
        setTree(data || {})
      }
    } catch (e) {
      console.error('Failed to fetch file tree', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchTree()
    }
  }, [isOpen, backendUrl])

  const filteredTree = Object.entries(tree).reduce((acc, [target, files]) => {
    const matchedFiles = files.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase()) || 
      target.toLowerCase().includes(search.toLowerCase())
    )
    if (matchedFiles.length > 0) {
      acc[target] = matchedFiles
    }
    return acc
  }, {} as FileTree)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-blue-500/20 rounded-xl shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] overflow-hidden flex flex-col h-[70vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Zap className="size-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-tighter">Context Injector</h3>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest opacity-70">Feed the Intelligence Engine</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="size-8 p-0 text-zinc-500 hover:text-white">
            <X className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800 bg-black">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by target or filename..." 
              className="h-10 pl-10 bg-zinc-900/50 border-zinc-800 text-xs font-mono placeholder:text-zinc-700 focus-visible:ring-1 focus-visible:ring-blue-500/30"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {Object.keys(filteredTree).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-700 gap-3">
                <Shield className="size-12 opacity-10" />
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-20">No matching evidence</p>
              </div>
            ) : (
              Object.entries(filteredTree).map(([target, files]) => (
                <div key={target} className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500/70 uppercase tracking-widest">
                    <Folder className="size-3" /> {target}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map(file => {
                      const isSelected = !!selectedFiles.find(f => f.target === target && f.filename === file.name)
                      return (
                        <button
                          key={file.name}
                          onClick={() => onToggleFile(target, file.name)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all text-left group",
                            isSelected 
                              ? "bg-blue-600/10 border-blue-500/50 text-blue-100 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]" 
                              : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                          )}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <FileText className={cn("size-4 shrink-0", isSelected ? "text-blue-400" : "text-zinc-600")} />
                            <span className="text-[11px] font-mono truncate">{file.name}</span>
                          </div>
                          {isSelected && <Check className="size-3 text-blue-400" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {selectedFiles.length} files staged for injection
          </div>
          <Button onClick={onClose} className="h-9 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-widest transition-all">
            Inject Context
          </Button>
        </div>
      </div>
    </div>
  )
}
