'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ConnectionOverlay } from './connection-overlay'
import { Sidebar } from './sidebar'
import { HeaderBar } from './header-bar'
import { TerminalView, type LogLine } from './terminal-view'
import { NotesModal } from './notes-modal'
import { AIPanel } from './ai-panel'
import { AIConfigModal } from './ai-config-modal'
import { EvidenceModal } from './evidence-modal'
import { UploadManager } from './upload-manager'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useC2Engine } from '@/hooks/use-c2-engine'
import dynamic from 'next/dynamic'
import { HistoryModal } from './history-modal'

const ShellPanel = dynamic(() => import('@/components/c2/shell-panel').then(m => m.ShellPanel), {
  ssr: false,
})

import {
  connectToBackend,
  runTool,
  killScan,
  compileTargetContext,
  fetchTools,
  type Tool,
  type Category,
  type AttackProfile
} from '@/lib/api-service'

export function Dashboard() {
  const { toast } = useToast()

  const [connected, setConnected] = useState(false)
  const [backendUrl, setBackendUrl] = useState('http://localhost:1453')

  const [tools, setTools] = useState<Tool[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [uploads, setUploads] = useState<string[]>([])
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null)
  const [target, setTarget] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  
  const [scanIds, setScanIds] = useState<Record<string, number>>({}) // toolName -> scanId

  // Multi-threading state via hook
  const { allLogs, setAllLogs, statuses, setStatuses } = useC2Engine(backendUrl, connected)

  const selectedTool = tools.find(t => t.id === selectedToolId)
  const selectedProfile = selectedTool?.profiles?.find(p => p.id === selectedProfileId)
  const processStatus = selectedTool ? (statuses[selectedTool.default_binary_name] || 'idle') : 'idle'

  // Map raw logs to LogLine objects for TerminalView
  const currentLogs: LogLine[] = useMemo(() => {
    if (!selectedTool) return []
    const raw = allLogs[selectedTool.default_binary_name] || []
    return raw.map((text, i) => ({
      id: i,
      text,
      type: 'data',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    }))
  }, [allLogs, selectedTool])

  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false)
  const [isShellOpen, setIsShellOpen] = useState(false)
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false)
  const [isUploadsOpen, setIsUploadsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<{ target: string; filename: string }[]>([])

  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/api/uploads`)
      if (res.ok) {
        const data = await res.json()
        setUploads(data || [])
      }
    } catch (e) { console.error(e) }
  }, [backendUrl])

  useEffect(() => {
    if (connected) {
      fetchTools(backendUrl).then(data => {
        setTools(data)
        const cats: Record<string, Tool[]> = {}
        data.forEach(t => {
          if (!cats[t.category]) cats[t.category] = []
          cats[t.category].push(t)
        })
        setCategories(Object.entries(cats).map(([label, tools]) => ({ label, tools })))
        if (data.length > 0) setSelectedToolId(data[0].id)
      })
      fetchUploads()
    }
  }, [connected, backendUrl, fetchUploads])

  useEffect(() => {
    const handleOpenAiSettings = () => setIsAIConfigOpen(true)
    document.addEventListener('open-ai-settings', handleOpenAiSettings)
    return () => document.removeEventListener('open-ai-settings', handleOpenAiSettings)
  }, [])

  const handleConnect = async (url: string) => {
    try {
      await connectToBackend(url)
      setBackendUrl(url)
      setConnected(true)
      toast({ title: 'Connected', description: 'Backend Active' })
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const handleExecute = async () => {
    if (!selectedTool || !selectedProfileId || !target.trim()) return

    try {
      setStatuses(prev => ({ ...prev, [selectedTool.default_binary_name]: 'running' }))
      setAllLogs(prev => ({ ...prev, [selectedTool.default_binary_name]: [`[*] Engaging ${selectedTool.name}...`] }))
      
      const data = await runTool({
        toolId: selectedTool.id,
        profileId: selectedProfileId,
        target
      }, backendUrl)

      setScanIds(prev => ({ ...prev, [selectedTool.default_binary_name]: data.scan_id }))
    } catch (e: any) {
      setStatuses(prev => ({ ...prev, [selectedTool.default_binary_name]: 'error' }))
      toast({ title: 'Execution Failed', description: e.message, variant: 'destructive' })
    }
  }

  const handleCancel = async () => {
    if (!selectedTool) return
    const sId = scanIds[selectedTool.default_binary_name]
    if (sId) {
      await killScan(sId, backendUrl)
      setStatuses(prev => ({ ...prev, [selectedTool.default_binary_name]: 'idle' }))
    }
  }

  const toggleEvidenceFile = (t: string, f: string) => {
    setSelectedEvidenceFiles(prev => {
      const exists = prev.find(file => file.target === t && file.filename === f)
      if (exists) return prev.filter(file => !(file.target === t && file.filename === f))
      return [...prev, { target: t, filename: f }]
    })
  }

  return (
    <>
      {!connected && <ConnectionOverlay onConnect={handleConnect} />}

      <div className="flex h-screen w-screen overflow-hidden bg-[#020203] text-zinc-300 relative">
        {/* Premium Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <Sidebar
          categories={categories}
          selectedToolId={selectedToolId}
          onSelectTool={(id) => {
            setSelectedToolId(id)
            const t = tools.find(x => x.id === id)
            if (t?.profiles?.length) setSelectedProfileId(t.profiles[0].id)
          }}
          processStatus={processStatus}
          backendUrl={backendUrl}
          onOpenAI={() => setIsAIPanelOpen(true)}
          onOpenShell={() => setIsShellOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          selectedEvidenceCount={selectedEvidenceFiles.length}
        />

        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden relative z-10 backdrop-blur-[2px]">
          <HeaderBar
            selectedToolName={selectedTool?.name || 'No Tool'}
            processStatus={processStatus}
            target={target}
            onTargetChange={setTarget}
            selectedProfile={selectedProfile}
            profiles={selectedTool?.profiles || []}
            onProfileChange={(p) => setSelectedProfileId(p.id)}
            onExecute={handleExecute}
            onCancel={handleCancel}
            onOpenNotes={() => setIsNotesOpen(true)}
            onOpenEvidence={() => setIsEvidenceOpen(true)}
            onOpenUploads={() => setIsUploadsOpen(true)}
            uploads={uploads}
            selectedToolCategory={selectedTool?.category}
          />

          <TerminalView
            logs={currentLogs}
            processStatus={processStatus}
            selectedToolName={selectedTool?.name || ''}
            target={target}
            profileName={selectedProfile?.name || ''}
            profileArgs={selectedProfile?.args}
            onClear={() => setAllLogs(p => ({ ...p, [selectedTool!.default_binary_name]: [] }))}
          />
        </div>
      </div>

      <EvidenceModal 
        isOpen={isEvidenceOpen} 
        onClose={() => setIsEvidenceOpen(false)}
        backendUrl={backendUrl} 
        selectedEvidenceFiles={selectedEvidenceFiles} 
        onToggleEvidenceFile={toggleEvidenceFile} 
      />

      <Dialog open={isUploadsOpen} onOpenChange={setIsUploadsOpen}>
        <DialogContent showCloseButton={false} className="max-w-3xl h-[60vh] p-0 overflow-hidden bg-black border-zinc-800 z-[250]">
          <UploadManager backendUrl={backendUrl} uploads={uploads} onRefresh={fetchUploads} onClose={() => setIsUploadsOpen(false)} />
        </DialogContent>
      </Dialog>

      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        backendUrl={backendUrl} 
      />

      <NotesModal isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} target={target || 'global'} />
      
      <AIConfigModal
        isOpen={isAIConfigOpen}
        onClose={() => setIsAIConfigOpen(false)}
        onShowToast={(t, d) => toast({ title: t, description: d })}
        backendUrl={backendUrl}
      />
      <AIPanel
        isOpen={isAIPanelOpen}        onClose={() => setIsAIPanelOpen(false)} 
        onShowToast={(t, d) => toast({ title: t, description: d })} 
        backendUrl={backendUrl} 
        selectedEvidenceFiles={selectedEvidenceFiles}
        onToggleEvidenceFile={toggleEvidenceFile}
      />
      <ShellPanel isOpen={isShellOpen} onClose={() => setIsShellOpen(false)} backendUrl={backendUrl} />
      <Toaster />
    </>
  )
}
