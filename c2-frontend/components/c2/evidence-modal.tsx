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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container - Locked to 35vw */}
      <div className="relative w-[35vw] h-[70vh] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Main Body - 30/70 Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar - 30% */}
          <div className="w-[30%] border-r border-zinc-800 flex flex-col bg-zinc-950">
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <span className="font-bold text-[10px] tracking-widest text-zinc-400 uppercase">Evidence Explorer</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-zinc-800" onClick={fetchTree}>
                <RefreshCw className={cn("size-3", loadingTree && "animate-spin")} />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-2">
              {Object.entries(tree).length === 0 ? (
                <div className="text-[10px] text-zinc-600 text-center p-4 italic uppercase">No targets detected</div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(tree).map(([target, files]) => {
                    const isOpen = openFolders.has(target)
                    return (
                      <div key={target}>
                        <div className="flex items-center w-full justify-between group">
                          <button
                            className="flex items-center flex-1 gap-1.5 px-2 py-1 hover:bg-zinc-800/50 rounded-sm text-left transition-colors"
                            onClick={() => toggleFolder(target)}
                          >
                            {isOpen ? <ChevronDown className="size-3 text-zinc-500" /> : <ChevronRight className="size-3 text-zinc-500" />}
                            <Folder className="size-3.5 text-blue-400/60" />
                            <span className="truncate text-[11px] text-zinc-300 font-bold">{target}</span>
                          </button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-white mr-1" onClick={() => handleCreateFile(target)}>
                            <Plus className="size-3 text-zinc-500" />
                          </Button>
                        </div>
                        
                        {isOpen && (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-zinc-800/50 pl-2">
                            {files.map((file) => {
                              const isSelected = selectedFile?.target === target && selectedFile?.file === file.name
                              const isAttached = !!selectedEvidenceFiles.find(f => f.target === target && f.filename === file.name)
                              return (
                                <div key={file.name} className={cn(
                                  "flex items-center w-full rounded-sm transition-colors group",
                                  isSelected ? "bg-blue-900/20 text-white" : "hover:bg-zinc-800/50 text-zinc-400"
                                )}>
                                  <input 
                                    type="checkbox"
                                    checked={isAttached}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      onToggleEvidenceFile(target, file.name)
                                    }}
                                    className="ml-1 rounded border-zinc-700 bg-zinc-900 text-blue-500 cursor-pointer scale-75"
                                  />
                                  <button
                                    className="flex items-center flex-1 gap-1.5 px-2 py-1 text-left text-[10px]"
                                    onClick={() => handleFileClick(target, file.name)}
                                  >
                                    <FileText className="size-3 text-zinc-500" />
                                    <span className="truncate">{file.name}</span>
                                  </button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 mr-1" onClick={(e) => handleDeleteFile(target, file.name, e)}>
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

          {/* Content - 70% */}
          <div className="w-[70%] flex flex-col h-full bg-black overflow-hidden relative">
            {selectedFile ? (
              <>
                <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-zinc-500">{selectedFile.target}</span>
                    <span className="text-zinc-700">/</span>
                    <span className="text-zinc-200 font-bold">{selectedFile.file}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <Button variant="outline" size="sm" className="h-6 text-[9px] bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20" onClick={handleSaveFile}>
                        <Save className="size-3 mr-1" /> SAVE
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-6 text-[9px] text-zinc-400 hover:text-white" onClick={() => setIsEditing(true)}>
                        EDIT
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => {
                        const blob = new Blob([fileContent], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = selectedFile.file; a.click(); URL.revokeObjectURL(url)
                    }}>
                      <Download className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={() => setSelectedFile(null)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {loadingContent ? (
                    <div className="p-4 text-zinc-600 animate-pulse text-[10px] font-mono uppercase">Streaming data...</div>
                  ) : isEditing ? (
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="w-full h-full resize-none bg-black text-green-500 font-mono text-[11px] p-6 focus:outline-none focus:ring-0 border-0 leading-relaxed"
                      spellCheck={false}
                    />
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <pre className="text-[11px] text-green-500/90 font-mono whitespace-pre-wrap leading-relaxed">
                          <code>{fileContent || "BUFFER EMPTY"}</code>
                        </pre>
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 gap-2 uppercase">
                <FileText className="size-10 opacity-10" />
                <p className="text-[10px] font-bold tracking-widest opacity-20">No File Engaged</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Footer / Close */}
        <div className="p-2 border-t border-zinc-800 bg-zinc-900/30 flex justify-end shrink-0">
           <Button variant="ghost" size="sm" className="h-7 text-[10px] font-mono text-zinc-500 hover:text-white" onClick={onClose}>
             [ EXIT EXPLORER ]
           </Button>
        </div>
      </div>
    </div>
  )
}
