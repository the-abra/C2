'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Download, FileText, Loader2, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  backendUrl: string
  sessionId: number
}

export function ReportModal({ isOpen, onClose, backendUrl, sessionId }: ReportModalProps) {
  const [report, setReport] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const loadReport = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const response = await fetch(`${backendUrl}/api/report?session_id=${sessionId}`)
      if (response.ok) {
        const data = await response.text()
        setReport(data)
      } else {
        setReport('# Error\nFailed to generate report from backend.')
      }
    } catch (e) {
      console.error(e)
      setReport('# Error\nFailed to connect to reporting engine.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && sessionId) {
      loadReport()
    }
  }, [isOpen, sessionId])

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([report], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = `Duelist_C2_Report_Sess${sessionId}_${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(element)
    element.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col bg-background border-border text-foreground">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border">
          <div className="flex flex-col">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Strategic Mission Briefing
            </DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">
              Automated Synthesis Engine — Session ID: {sessionId}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadReport} 
              disabled={loading}
              className="h-8 border-border bg-muted/10 hover:bg-muted/20 text-[10px] font-mono uppercase"
            >
              <RefreshCw className={`size-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
            <Button 
              size="sm" 
              onClick={handleDownload} 
              disabled={loading || !report}
              className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-mono uppercase"
            >
              <Download className="size-3 mr-2" />
              Download .md
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-4 overflow-hidden">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
                <Loader2 className="size-8 text-primary animate-spin" />
                <div className="text-[10px] font-mono text-muted-foreground animate-pulse uppercase tracking-[0.3em]">SYNTHESIZING MISSION DATA...</div>
              </div>
            ) : (
              <div className="prose prose-invert prose-zinc max-w-none px-4
                prose-headings:font-mono prose-headings:font-bold prose-headings:tracking-tighter prose-headings:uppercase
                prose-h1:text-2xl prose-h1:mb-8 prose-h1:text-primary prose-h1:border-b-2 prose-h1:border-primary/20 prose-h1:pb-4
                prose-h2:text-lg prose-h2:border-l-4 prose-h2:border-primary prose-h2:pl-4 prose-h2:mt-10 prose-h2:mb-4 prose-h2:bg-primary/5 prose-h2:py-2
                prose-h3:text-sm prose-h3:text-foreground prose-h3:mt-6
                prose-p:text-muted-foreground prose-p:text-xs prose-p:leading-relaxed
                prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:font-mono prose-code:text-[11px]
                prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:shadow-inner
                prose-li:text-muted-foreground prose-li:text-xs
                prose-table:border prose-table:border-border prose-table:text-[10px]
                prose-th:bg-muted/30 prose-th:px-4 prose-th:py-2 prose-th:font-mono prose-th:uppercase
                prose-td:px-4 prose-td:py-2 prose-td:font-mono"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report}
                </ReactMarkdown>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="pt-4 border-t border-border flex justify-end shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-[10px] font-mono uppercase text-muted-foreground hover:text-foreground">
            [ EXIT BRIEFING ]
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
