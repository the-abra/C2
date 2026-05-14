'use client'

import { useState, useCallback, useEffect } from 'react'
import { FileText, X, Edit3, Eye, Download, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { get, set } from 'idb-keyval'

interface NotesModalProps {
  isOpen: boolean
  onClose: () => void
  target?: string
}

const DEFAULT_TEMPLATE = `# Penetration Test Report

## Target Information
- **Target:** \`[TARGET_IP/URL]\`
- **Date:** ${new Date().toISOString().split('T')[0]}
- **Tester:** [NAME]

---

## Executive Summary

[Brief overview of findings]

---

## Findings

### Critical

| ID | Vulnerability | CVSS | Status |
|----|---------------|------|--------|
| 1  | SQL Injection | 9.8  | Open   |

### High

[Details...]

---

## Recommendations

1. 
2. 
3. 

---

## Appendix

### Raw Tool Output
\`\`\`
[Paste relevant output here]
\`\`\`
`

export function NotesModal({ isOpen, onClose, target = 'global' }: NotesModalProps) {
  const [content, setContent] = useState(DEFAULT_TEMPLATE)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  // Load note from IndexedDB on mount or target change
  useEffect(() => {
    if (!isOpen) return
    const loadNote = async () => {
      try {
        const savedNotes = await get<Record<string, string>>('tactical_notes') || {}
        if (savedNotes[target]) {
          setContent(savedNotes[target])
        } else {
          // Replace placeholder in template if no note exists
          const templateWithTarget = DEFAULT_TEMPLATE.replace('[TARGET_IP/URL]', target === 'global' ? '[TARGET_IP/URL]' : target)
          setContent(templateWithTarget)
        }
      } catch (e) {
        console.error('Failed to load note from IndexedDB', e)
      }
    }
    loadNote()
  }, [isOpen, target])

  const handleContentChange = useCallback(
    async (newContent: string) => {
      setContent(newContent)
      try {
        const savedNotes = await get<Record<string, string>>('tactical_notes') || {}
        savedNotes[target] = newContent
        await set('tactical_notes', savedNotes)
      } catch (e) {
        console.error('Failed to save note to IndexedDB', e)
      }
    },
    [target]
  )

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
    handleContentChange('')
  }

  const handleLoadTemplate = () => {
    const templateWithTarget = DEFAULT_TEMPLATE.replace('[TARGET_IP/URL]', target === 'global' ? '[TARGET_IP/URL]' : target)
    handleContentChange(templateWithTarget)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[85vh] mx-4 flex flex-col bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded bg-zinc-900 border border-zinc-800 shadow-inner">
              <FileText className="size-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-mono text-zinc-100">Ghost Notes</h2>
              <p className="text-[10px] font-mono text-zinc-500">Target: <span className="text-blue-400">{target}</span></p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded p-0.5 border border-zinc-800">
            <button
              onClick={() => setActiveTab('edit')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors',
                activeTab === 'edit'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
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
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              )}
            >
              <Eye className="size-3" />
              Preview
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadTemplate}
              className="h-7 px-2 text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              Template
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="size-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              title="Copy to clipboard"
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="size-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              title="Download as .md"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="size-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
              title="Clear content"
            >
              <Trash2 className="size-3.5" />
            </Button>
            <div className="w-px h-5 bg-zinc-800 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden bg-black">
          {activeTab === 'edit' ? (
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full resize-none bg-transparent text-green-400 font-mono text-[13px] p-6 focus:outline-none focus:ring-0 border-0 leading-relaxed selection:bg-green-900/40"
              placeholder="Start typing your tactical notes here..."
              spellCheck={false}
            />
          ) : (
            <ScrollArea className="h-full bg-zinc-950">
              <div className="p-8 prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:text-zinc-100 prose-p:text-zinc-400 prose-strong:text-zinc-200 prose-code:text-blue-400 prose-code:bg-blue-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-pre:bg-black prose-pre:border prose-pre:border-zinc-800 prose-th:text-zinc-300 prose-td:text-zinc-400 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
          <span className="text-[10px] font-mono text-zinc-500">
            {content.length} characters | {content.split('\n').length} lines
          </span>
          <span className="text-[10px] font-mono text-blue-400/80 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
            Auto-saved to GhostDB (IndexedDB)
          </span>
        </div>
      </div>
    </div>
  )
}
