'use client'

import React, { useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useC2Store } from '@/hooks/use-c2-store'
import { Shield, Server, RefreshCw, Cpu, Trash2, List, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchDiscoveries, type Discovery } from '@/lib/api-service'
import { stripANSI } from '@/lib/utils'
import { TargetDossier } from './target-dossier'
import { cn } from '@/lib/utils'

type TargetNodeData = { label: string; sublabel?: string };
type TargetNode = Node<TargetNodeData, 'target'>;

type ServiceNodeData = { label: string; status?: string; port?: string };
type ServiceNode = Node<ServiceNodeData, 'service'>;

const TargetNode = ({ data }: NodeProps<TargetNode>) => (
  <div className="px-4 py-2 shadow-lg rounded-md bg-card border border-primary/40 text-foreground min-w-[150px] relative group hover:border-primary transition-colors">
    <div className="absolute inset-0 rounded-md border border-primary/60 animate-ping opacity-25 pointer-events-none" />
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary" />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
        <Shield className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-primary/70">Target</div>
        <div className="text-sm font-mono truncate">{stripANSI(data.label)}</div>
        {data.sublabel && <div className="text-[10px] opacity-50 truncate">{stripANSI(data.sublabel)}</div>}
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary" />
  </div>
)

const ServiceNode = ({ data }: NodeProps<ServiceNode>) => (
  <div className="px-4 py-2 shadow-lg rounded-md bg-card border border-border text-foreground min-w-[120px] relative hover:border-muted-foreground transition-colors">
    <div className="absolute inset-0 rounded-md border border-accent/40 animate-ping opacity-20 pointer-events-none" />
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-muted-foreground" />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-muted/10 rounded-md border border-border">
        <Server className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service</div>
        <div className="text-sm font-mono truncate">{stripANSI(data.label)}</div>
        {data.port && <div className="text-[10px] text-accent font-bold uppercase">Port {stripANSI(data.port)}</div>}
      </div>
    </div>
  </div>
)

type VulnNodeData = { label: string; severity?: string };
type VulnNode = Node<VulnNodeData, 'vuln'>;

const VulnNode = ({ data }: NodeProps<VulnNode>) => (
  <div className="px-4 py-2 shadow-lg rounded-md bg-card border border-destructive/50 text-foreground min-w-[140px] relative hover:border-destructive transition-colors animate-subtle-pulse">
    <div className="absolute inset-0 rounded-md border border-destructive/80 animate-ping opacity-35 pointer-events-none" />
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-destructive" />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-destructive/10 rounded-md border border-destructive/50">
        <Cpu className="w-4 h-4 text-destructive" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-destructive">Vulnerability</div>
        <div className="text-sm font-mono truncate">{stripANSI(data.label)}</div>
        {data.severity && <div className="text-[10px] text-destructive/80 font-bold uppercase">{stripANSI(data.severity)}</div>}
      </div>
    </div>
  </div>
)

const nodeTypes = {
  target: TargetNode,
  service: ServiceNode,
  vuln: VulnNode,
}

export function VisualGraph() {
  const { 
    nodes, edges, discoveries, backendUrl, connected, currentSessionId,
    onNodesChange, onEdgesChange, setNodes, setEdges, setDiscoveries, setTarget,
    noteUpdateTimestamp, setModalOpen
  } = useC2Store()

  const [selectedEntity, setSelectedEntity] = React.useState<{ value: string; type: string } | null>(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterType, setFilterType] = React.useState<string>('all')
  const [showSidebar, setShowSidebar] = React.useState(true)
  const [contextMenu, setContextMenu] = React.useState<{
    x: number; y: number; nodeLabel: string; nodeType: string
  } | null>(null)

  const refreshDiscoveries = React.useCallback(async () => {
    if (!connected || !currentSessionId) return
    try {
      const data = await fetchDiscoveries(backendUrl, currentSessionId)
      setDiscoveries(data || [])
    } catch (e) {
      console.error('Failed to sync discoveries:', e)
    }
  }, [connected, backendUrl, currentSessionId, setDiscoveries])

  const clearGraph = React.useCallback(async () => {
    if (!connected || !currentSessionId) return
    if (!confirm('Are you sure you want to clear all discovered host nodes and edges from this mission graph?')) return
    try {
      const res = await fetch(`${backendUrl}/api/discoveries?session_id=${currentSessionId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setDiscoveries([])
        setNodes([])
        setEdges([])
      }
    } catch (e) {
      console.error('Failed to clear discoveries:', e)
    }
  }, [connected, backendUrl, currentSessionId, setDiscoveries, setNodes, setEdges])

  const onNodeContextMenu = React.useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    const label = (node.data as any)?.label || ''
    setContextMenu({ x: event.clientX, y: event.clientY, nodeLabel: stripANSI(label), nodeType: node.type || '' })
  }, [])

  const handleContextAction = React.useCallback((action: string) => {
    if (!contextMenu) return
    const target = contextMenu.nodeLabel

    if (action === 'set-target') {
      setTarget(target)
    } else if (action === 'copy') {
      navigator.clipboard.writeText(target)
    } else {
      document.dispatchEvent(new CustomEvent('quick-scan', { detail: { tool: action, target } }))
    }
    setContextMenu(null)
  }, [contextMenu, setTarget])

  React.useEffect(() => {
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    refreshDiscoveries()
    const interval = setInterval(refreshDiscoveries, 5000)
    return () => clearInterval(interval)
  }, [refreshDiscoveries])

  useEffect(() => {
    if (!discoveries || discoveries.length === 0) return

    const existingNodeIds = new Set(nodes.map(n => n.id))
    const addedNodes: Node[] = []
    
    let targetCount = nodes.filter(n => n.type === 'target').length
    let serviceCount = nodes.filter(n => n.type === 'service' || n.type === 'vuln').length

    discoveries.forEach((d) => {
      const nodeId = `${d.type}-${d.id}`
      if (existingNodeIds.has(nodeId)) return

      if (d.type === 'domain' || d.type === 'ip') {
        addedNodes.push({
          id: nodeId,
          type: 'target',
          position: { x: 300 + (targetCount * 200), y: 100 },
          data: { label: d.value, sublabel: d.type.toUpperCase() },
        })
        targetCount++
      } else if (d.type === 'service') {
        let port = ''
        try {
          if (d.metadata) {
            const meta = JSON.parse(d.metadata)
            port = meta.port || ''
          }
        } catch (e) {}

        addedNodes.push({
          id: nodeId,
          type: 'service',
          position: { x: 100 + (serviceCount * 150), y: 300 },
          data: { label: d.value, port: port },
        })
        serviceCount++
      } else if (d.type === 'vuln') {
        let severity = ''
        try {
          if (d.metadata) {
            const meta = JSON.parse(d.metadata)
            severity = meta.severity || ''
          }
        } catch (e) {}

        addedNodes.push({
          id: nodeId,
          type: 'vuln',
          position: { x: 500 + (serviceCount * 180), y: 500 },
          data: { label: d.value, severity: severity },
        })
        serviceCount++
      }
    })

    if (addedNodes.length > 0) {
      setNodes([...nodes, ...addedNodes])
    }

    const existingEdgeIds = new Set(edges.map(e => e.id))
    const addedEdges: Edge[] = []

    discoveries.forEach((d) => {
      const nodeId = `${d.type}-${d.id}`
      // Find parent by scan ID correlation
      const parentTarget = discoveries.find(t => 
        (t.type === 'domain' || t.type === 'ip') && 
        t.source_scan_id === d.source_scan_id &&
        t.id !== d.id // Don't link to self
      )
      
      if (parentTarget) {
        const edgeId = `e-${parentTarget.type}-${parentTarget.id}-${nodeId}`
        if (!existingEdgeIds.has(edgeId)) {
          const isVuln = d.type === 'vuln'
          addedEdges.push({
            id: edgeId,
            source: `${parentTarget.type}-${parentTarget.id}`,
            target: nodeId,
            animated: true,
            label: d.type === 'service' ? 'PORT' : isVuln ? 'VULN' : 'LINK',
            labelStyle: { fill: 'var(--muted-foreground)', fontSize: '6px', fontWeight: 'bold', fontFamily: 'monospace' },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 2,
            labelBgStyle: { fill: 'var(--background)', fillOpacity: 0.8 },
            style: { 
              stroke: isVuln ? 'var(--destructive)' : 'var(--primary)', 
              strokeWidth: isVuln ? 1.5 : 1,
              opacity: 0.4
            },
          })
        }
      }
    })

    if (addedEdges.length > 0) {
      setEdges([...edges, ...addedEdges])
    }
  }, [discoveries, setNodes, setEdges])

  const onNodeClick = React.useCallback((event: React.MouseEvent, node: Node) => {
    const label = (node.data as any)?.label || ''
    setSelectedEntity({ value: label, type: node.type || 'target' })
  }, [])

  const filteredDiscoveries = useMemo(() => {
    return (discoveries || []).filter(d => {
      const matchesSearch = stripANSI(d.value).toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterType === 'all' || d.type === filterType
      return matchesSearch && matchesFilter
    })
  }, [discoveries, searchQuery, filterType])

  return (
    <div className="w-full h-full bg-background relative group flex overflow-hidden">
      {/* Discovery List Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-border bg-card/30 backdrop-blur-md flex flex-col shrink-0 animate-in slide-in-from-left duration-300 relative z-20">
          <div className="p-4 border-b border-border bg-muted/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="size-3.5 text-primary" />
              <h3 className="text-[10px] font-black font-mono uppercase tracking-widest text-foreground">Discoveries</h3>
            </div>
            <button onClick={() => setShowSidebar(false)} className="text-muted-foreground hover:text-foreground p-1">
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
              <input 
                type="text" 
                placeholder="SEARCH NODES..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-muted/10 border border-border rounded font-mono text-[9px] uppercase tracking-tighter focus:outline-none focus:border-primary/40"
              />
            </div>
            
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {['all', 'domain', 'ip', 'service', 'vuln'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-2 py-0.5 rounded border text-[8px] font-mono font-black uppercase tracking-tighter transition-all shrink-0",
                    filterType === type 
                      ? "bg-primary/20 border-primary/40 text-primary" 
                      : "border-border/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredDiscoveries.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">No matching entities</p>
              </div>
            ) : (
              filteredDiscoveries.map((d) => (
                <div 
                  key={d.id} 
                  className="p-2 rounded border border-border/20 bg-muted/5 hover:bg-muted/10 hover:border-primary/20 cursor-pointer group transition-all"
                  onClick={() => setSelectedEntity({ value: d.value, type: d.type })}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "px-1 py-0.5 rounded font-mono text-[7px] font-black uppercase tracking-tighter",
                      d.type === 'vuln' ? "bg-destructive/10 text-destructive" : 
                      d.type === 'service' ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                    )}>
                      {d.type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[7px] font-mono text-muted-foreground/30 uppercase">Scan #{d.source_scan_id}</span>
                      <span className="text-[8px] font-mono text-muted-foreground/30">{new Date(d.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono font-bold truncate text-foreground group-hover:text-primary transition-colors">
                    {stripANSI(d.value)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sidebar Toggle Button (if hidden) */}
      {!showSidebar && (
        <button 
          onClick={() => setShowSidebar(true)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-1.5 bg-card border border-border rounded-md shadow-xl hover:text-primary transition-all"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
          <div className="text-[10px] font-bold text-primary/50 uppercase tracking-[0.2em]">Visual Infrastructure Mapping</div>
          <div className="text-[8px] text-muted-foreground font-mono uppercase">Nodes: {(nodes || []).length} | Edges: {(edges || []).length} | Discoveries: {(discoveries || []).length}</div>
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
          <button
            onClick={clearGraph}
            className="p-2 bg-card/50 border border-border rounded-md hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
            title="Clear all discoveries in this mission"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              const values = (discoveries || []).map(d => d.value).join('\n')
              navigator.clipboard.writeText(values)
            }}
            className="p-2 bg-card/50 border border-border rounded-md hover:bg-muted transition-colors"
            title="Copy all discoveries to clipboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
          <button 
            onClick={refreshDiscoveries}
            className="p-2 bg-card/50 border border-border rounded-md hover:bg-muted transition-colors"
            title="Refresh discoveries"
          >
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeContextMenu={onNodeContextMenu}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          colorMode="system"
          fitView
        >
          <Background color="var(--border)" gap={20} size={1} />
          <Controls className="bg-card border-border fill-foreground" />
          <MiniMap 
            nodeColor="var(--muted)" 
            maskColor="rgba(0, 0, 0, 0.1)" 
            className="bg-card border border-border"
          />
        </ReactFlow>
      </div>

      {selectedEntity && (
        <TargetDossier
          entityValue={selectedEntity.value}
          entityType={selectedEntity.type}
          discoveries={discoveries}
          backendUrl={backendUrl}
          sessionId={currentSessionId || 0}
          noteUpdateTimestamp={noteUpdateTimestamp}
          onSetTarget={(val) => setTarget(val)}
          onQuickAction={(tool, val) => {
            document.dispatchEvent(new CustomEvent('quick-scan', { detail: { tool, target: val } }))
          }}
          onOpenNotes={() => {
            setTarget(selectedEntity.value)
            setModalOpen('notes', true)
          }}
          onClose={() => setSelectedEntity(null)}
        />
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[500] min-w-[180px] py-1.5 bg-background border border-border rounded-lg shadow-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-3 py-1.5 border-b border-border mb-1">
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Node Actions</p>
            <p className="text-xs font-mono truncate text-foreground">{contextMenu.nodeLabel}</p>
          </div>
          <button onClick={() => handleContextAction('set-target')} className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted transition-colors flex items-center gap-2">
            <Shield className="size-3 text-primary" /> Set as Target
          </button>
          <button onClick={() => handleContextAction('copy')} className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted transition-colors flex items-center gap-2">
            <RefreshCw className="size-3 text-muted-foreground" /> Copy Value
          </button>
          <div className="border-t border-border my-1" />
          <button onClick={() => handleContextAction('nmap')} className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted transition-colors flex items-center gap-2">
            <Server className="size-3 text-accent" /> Scan with Nmap
          </button>
          <button onClick={() => handleContextAction('nuclei')} className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted transition-colors flex items-center gap-2">
            <Cpu className="size-3 text-destructive" /> Scan with Nuclei
          </button>
          <button onClick={() => handleContextAction('httpx')} className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted transition-colors flex items-center gap-2">
            <Server className="size-3 text-accent" /> Probe with Httpx
          </button>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none bg-tactical-grid opacity-[0.02]" />
    </div>
  )
}
