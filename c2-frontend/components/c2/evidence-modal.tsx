'use client'

import React, { useState, useEffect } from 'react'
import { Folder, FileText, ChevronRight, ChevronDown, RefreshCw, X, Download, Plus, Trash2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface FileNode {
  name: string
  type: 'file' | 'folder'
}

type FileTree = Record<string, FileNode[]>

interface EvidenceModalProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
  selectedEvidenceFiles: { target: string; filename: string }[]
  onToggleEvidenceFile: (target: string, filename: string) => void
}

export function EvidenceModal({ isOpen, onClose, backendUrl, selectedEvidenceFiles, onToggleEvidenceFile }: EvidenceModalProps) {
  const [tree, setTree] = useState<FileTree>({})
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<{ target: string; file: string } | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [loadingTree, setLoadingTree] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const fetchTree = async () => {
    setLoadingTree(true)
    try {
      const res = await fetch(`${backendUrl}/api/files`)
      if (res.ok) {
        const data = await res.json()
        setTree(data || {})
      }
    } catch (e) {
      console.error('Failed to fetch file tree', e)
    } finally {
      setLoadingTree(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchTree()
    }
  }, [isOpen, backendUrl])

  const toggleFolder = (folderName: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderName)) next.delete(folderName)
      else next.add(folderName)
      return next
    })
  }

  const handleFileClick = async (target: string, file: string) => {
    setSelectedFile({ target, file })
    setIsEditing(false)
    setLoadingContent(true)
    try {
      const res = await fetch(`${backendUrl}/api/files/content?target=${encodeURIComponent(target)}&file=${encodeURIComponent(file)}`)
      if (res.ok) {
        const text = await res.text()
        setFileContent(text)
      } else {
        setFileContent('Error loading file content.')
      }
    } catch (e) {
      setFileContent('Error connecting to backend.')
    } finally {
      setLoadingContent(false)
    }
  }

  const handleCreateFile = async (target: string) => {
    const filename = prompt('Enter new filename (e.g., notes.txt):')
    if (!filename) return

    try {
      const res = await fetch(`${backendUrl}/api/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, filename, content: '' })
      })
      if (res.ok) {
        await fetchTree()
        handleFileClick(target, filename)
        setIsEditing(true)
      }
    } catch (e) {
      console.error('Failed to create file', e)
    }
  }

  const handleDeleteFile = async (target: string, file: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete ${file}?`)) return

    try {
      const res = await fetch(`${backendUrl}/api/files/delete?target=${encodeURIComponent(target)}&file=${encodeURIComponent(file)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchTree()
        if (selectedFile?.target === target && selectedFile?.file === file) {
          setSelectedFile(null)
          setFileContent('')
        }
      }
    } catch (err) {
      console.error('Failed to delete file', err)
    }
  }

  const handleSaveFile = async () => {
    if (!selectedFile) return
    try {
      const res = await fetch(`${backendUrl}/api/files/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: selectedFile.target, filename: selectedFile.file, content: fileContent })
      })
      if (res.ok) {
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Failed to save file', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container - Locked to 70vw */}
      <div className="relative w-[70vw] h-[70vh] bg-background border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Main Body - 30/70 Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar - 35% */}
          <div className="w-[35%] border-r border-border flex flex-col bg-background">
            <div className="p-3 border-b border-border flex justify-between items-center bg-muted/10">
              <span className="font-bold text-[10px] tracking-widest text-muted-foreground uppercase">Evidence Explorer</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/20" onClick={fetchTree}>
                <RefreshCw className={cn("size-3", loadingTree && "animate-spin")} />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-2">
              {Object.entries(tree).length === 0 ? (
                <div className="text-[10px] text-muted-foreground text-center p-4 italic uppercase">No targets detected</div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(tree).map(([target, files]) => {
                    const isOpen = openFolders.has(target)
                    return (
                      <div key={target}>
                        <div className="flex items-center w-full justify-between group">
                          <button
                            className="flex items-center flex-1 gap-1.5 px-2 py-1 hover:bg-muted/30 rounded-sm text-left transition-colors"
                            onClick={() => toggleFolder(target)}
                          >
                            {isOpen ? <ChevronDown className="size-3 text-muted-foreground" /> : <ChevronRight className="size-3 text-muted-foreground" />}
                            <Folder className="size-3.5 text-primary/60" />
                            <span className="truncate text-[11px] text-muted-foreground font-bold">{target}</span>
                          </button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-foreground mr-1" onClick={() => handleCreateFile(target)}>
                            <Plus className="size-3 text-muted-foreground" />
                          </Button>
                        </div>
                        
                        {isOpen && (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                            {files.length === 0 ? (
                              <div className="text-[9px] text-muted-foreground/50 py-1 px-2 italic uppercase">No files found</div>
                            ) : files.map((file) => {
                              const isSelected = selectedFile?.target === target && selectedFile?.file === file.name
                              const isAttached = !!selectedEvidenceFiles.find(f => f.target === target && f.filename === file.name)
                              return (
                                <div key={file.name} className={cn(
                                  "flex items-center w-full rounded-sm transition-colors group",
                                  isSelected ? "bg-primary/20 text-foreground" : "hover:bg-muted/30 text-muted-foreground"
                                )}>
                                  <input 
                                    type="checkbox"
                                    checked={isAttached}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      onToggleEvidenceFile(target, file.name)
                                    }}
                                    className="ml-1 rounded border-border bg-muted/20 text-primary cursor-pointer scale-75"
                                  />
                                  <button
                                    className="flex items-center flex-1 gap-1.5 px-2 py-1 text-left text-[10px]"
                                    onClick={() => handleFileClick(target, file.name)}
                                  >
                                    <FileText className="size-3 text-muted-foreground" />
                                    <span className="truncate">{file.name}</span>
                                  </button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 mr-1" onClick={(e) => handleDeleteFile(target, file.name, e)}>
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Content - 65% */}
          <div className="w-[65%] flex flex-col h-full bg-background overflow-hidden relative">
            {selectedFile ? (
              <>
                <div className="px-4 py-2 bg-muted/10 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-muted-foreground">{selectedFile.target}</span>
                    <span className="text-muted-foreground/30">/</span>
                    <span className="text-foreground font-bold">{selectedFile.file}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <Button variant="outline" size="sm" className="h-6 text-[9px] bg-accent/10 text-accent hover:bg-accent/20 border-accent/20" onClick={handleSaveFile}>
                        <Save className="size-3 mr-1" /> SAVE
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 text-[9px] text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
                        EDIT
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => {
                        const blob = new Blob([fileContent], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = selectedFile.file; a.click(); URL.revokeObjectURL(url)
                    }}>
                      <Download className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onClose}>
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {loadingContent ? (
                    <div className="p-4 text-muted-foreground animate-pulse text-[10px] font-mono uppercase">Streaming data...</div>
                  ) : isEditing ? (
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="w-full h-full resize-none bg-background text-term-success font-mono text-[11px] p-6 focus:outline-none focus:ring-0 border-0 leading-relaxed"
                      spellCheck={false}
                    />
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <pre className="text-[11px] text-term-success/90 font-mono whitespace-pre-wrap leading-relaxed">
                          <code>{fileContent || "BUFFER EMPTY"}</code>
                        </pre>
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 uppercase">
                <FileText className="size-10 opacity-10" />
                <p className="text-[10px] font-bold tracking-widest opacity-20">No File Engaged</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Footer / Close */}
        <div className="p-2 border-t border-border bg-muted/5 flex justify-end shrink-0">
           <Button variant="ghost" size="sm" className="h-7 text-[10px] font-mono text-muted-foreground hover:text-foreground" onClick={onClose}>
             [ EXIT EXPLORER ]
           </Button>
        </div>
      </div>
    </div>
  )
}
