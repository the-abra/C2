'use client'

import React, { useState, useRef } from 'react'
import { Upload, Trash2, File, Loader2, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface UploadManagerProps {
  backendUrl: string
  uploads: string[]
  onRefresh: () => void
  onClose: () => void
}

export function UploadManager({ backendUrl, uploads, onRefresh, onClose }: UploadManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${backendUrl}/api/uploads`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        onRefresh()
      }
    } catch (e) {
      console.error('Upload failed', e)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return
    try {
      const res = await fetch(`${backendUrl}/api/uploads?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        onRefresh()
      }
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background text-muted-foreground font-mono text-sm border border-border rounded-lg shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 border border-primary/20 rounded">
            <Upload className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Tactical File Manager</h3>
            <p className="text-[10px] text-muted-foreground uppercase">Payloads & Forensics Lab</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="p-6 border-b border-border bg-muted/5">
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleUpload}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-12 gap-3 bg-muted/10 border-border hover:bg-muted/20 text-foreground border-dashed border-2"
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Upload className="size-5 text-primary" />
          )}
          <span className="font-bold uppercase tracking-widest text-xs">Drop Payload or Click to Upload</span>
        </Button>
        <p className="text-[9px] text-muted-foreground/60 mt-2 text-center uppercase tracking-tighter">
          Files will be accessible via target selection for file-based scanners
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <File className="size-12 mb-3" />
            <p className="text-xs uppercase font-bold">Repository Empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {uploads.map((file) => (
              <div
                key={file}
                className="flex items-center justify-between p-3 rounded bg-muted/10 border border-border/50 hover:border-border transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <File className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-xs text-muted-foreground">{file}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(file)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 bg-muted/10 border-t border-border flex items-center gap-3">
        <AlertTriangle className="size-4 text-warning/50 shrink-0" />
        <p className="text-[9px] text-muted-foreground leading-tight uppercase">
          Warning: Uploaded files are stored in plaintext on the backend host. Ensure proper sanitization before analysis.
        </p>
      </div>
    </div>
  )
}
