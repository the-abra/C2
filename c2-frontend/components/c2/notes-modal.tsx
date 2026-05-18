'use client'

import { useState, useCallback, useEffect } from 'react'
import { FileText, X, Edit3, Eye, Download, Trash2, Copy, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { fetchNote, saveNote } from '@/lib/api-service'

interface NotesModalProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
  target: string
  sessionId: number
}

const DEFAULT_TEMPLATE = `# 🎯 CTF Mission Notes

**Target:** \`[TARGET_IP/URL]\`
**Platform:** [ ] HTB  [ ] THM  [ ] PicoCTF  [ ] Other: ___
**Date:** ${new Date().toISOString().split('T')[0]}
**Difficulty:** [ ] Easy  [ ] Medium  [ ] Hard

---

## 🔍 Open Ports & Services

| Port | Protocol | Service | Version | Notes |
|------|----------|---------|---------|-------|
|  |  |  |  |  |
|  |  |  |  |  |

---

## 🌐 Web Discovery

- **Tech Stack:** 
- **CMS/Framework:** 
- **Hidden Paths Found:** 
- **Interesting Headers:** 
- **Login Pages:** 

---

## 🔑 Credentials Found

| Username | Password | Service | Source |
|----------|----------|---------|--------|
|  |  |  |  |

---

## 💥 Vulnerabilities Identified

| Vuln Type | Location | Severity | Exploited? |
|-----------|----------|----------|-----------|
|  |  |  |  |

---

## 🚩 Flags Captured

| Flag | Value | Points |
|------|-------|--------|
| user.txt |  |  |
| root.txt |  |  |

---

## ⬆️ Privilege Escalation Path

\`\`\`
Initial Access →  →  → ROOT
\`\`\`

**SUID Binaries:**
**Sudo Rights:**
**Cron Jobs:**
**Writable Paths:**

---

## 📋 Next Steps

- [ ] 
- [ ] 
- [ ] 

---

## 📝 Raw Notes / Scratch Pad

\`\`\`
[Paste relevant tool output, hashes to crack, encoded strings, etc.]
\`\`\`
`

export function NotesModal({ isOpen, onClose, backendUrl, target, sessionId }: NotesModalProps) {
  const [content, setContent] = useState(DEFAULT_TEMPLATE)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load note from backend on mount or target/session change
  useEffect(() => {
    if (!isOpen || !sessionId || !target) return
    const loadNote = async () => {
      setLoading(true)
      try {
        const data = await fetchNote(backendUrl, sessionId, target)
        if (data.content) {
          setContent(data.content)
        } else {
          const templateWithTarget = DEFAULT_TEMPLATE.replace('[TARGET_IP/URL]', target)
          setContent(templateWithTarget)
        }
      } catch (e) {
        console.error('Failed to load note from backend', e)
      } finally {
        setLoading(false)
      }
    }
    loadNote()
  }, [isOpen, target, sessionId, backendUrl])

  const handleSave = async () => {
    if (!sessionId || !target) return
    setSaving(true)
    try {
      await saveNote(backendUrl, sessionId, target, content)
    } catch (e) {
      console.error('Failed to save note', e)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pentest-report-${target}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    setContent('')
  }

  const handleLoadTemplate = () => {
    const templateWithTarget = DEFAULT_TEMPLATE.replace('[TARGET_IP/URL]', target)
    setContent(templateWithTarget)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl h-[85vh] mx-4 flex flex-col bg-background border border-border rounded-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded bg-muted/10 border border-border shadow-inner">
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-mono text-foreground uppercase tracking-tight">Mission Intelligence</h2>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Target: <span className="text-primary">{target}</span></p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-muted/10 rounded p-0.5 border border-border">
            <button
              onClick={() => setActiveTab('edit')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors',
                activeTab === 'edit'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Edit3 className="size-3" />
              Edit
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors',
                activeTab === 'preview'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Eye className="size-3" />
              Preview
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-7 px-3 text-[10px] font-mono uppercase bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            >
              {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : <Save className="size-3 mr-1" />}
              Commit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadTemplate}
              className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/10"
            >
              Template
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/10"
              title="Copy to clipboard"
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/10"
              title="Download as .md"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Clear content"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/10"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Retrieving Tactical Notes...</p>
            </div>
          ) : activeTab === 'edit' ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full resize-none bg-transparent text-term-success font-mono text-[13px] p-6 focus:outline-none focus:ring-0 border-0 leading-relaxed selection:bg-primary/30"
              placeholder="Start typing your tactical notes here..."
              spellCheck={false}
            />
          ) : (
            <ScrollArea className="h-full bg-background">
              <div className="p-8 prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-pre:bg-background prose-pre:border prose-pre:border-border prose-th:text-foreground prose-td:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/10 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {content.length} CHARS | {content.split('\n').length} LINES
          </span>
          <span className="text-[10px] font-mono text-primary/80 flex items-center gap-1.5 uppercase tracking-widest">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Tactical Sync Active
          </span>
        </div>
      </div>
    </div>
  )
}
