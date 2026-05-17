'use client'

import React, { useEffect } from 'react'
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
import { Shield, Server, RefreshCw, Cpu } from 'lucide-react'
import { fetchDiscoveries, type Discovery } from '@/lib/api-service'

type TargetNodeData = { label: string; sublabel?: string };
type TargetNode = Node<TargetNodeData, 'target'>;

type ServiceNodeData = { label: string; status?: string; port?: string };
type ServiceNode = Node<ServiceNodeData, 'service'>;

const TargetNode = ({ data }: NodeProps<TargetNode>) => (
  <div className="px-4 py-2 shadow-lg rounded-md bg-card border border-primary/40 text-foreground min-w-[150px] relative group hover:border-primary transition-colors">
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-primary" />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
        <Shield className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-primary/70">Target</div>
        <div className="text-sm font-mono truncate">{data.label}</div>
        {data.sublabel && <div className="text-[10px] opacity-50 truncate">{data.sublabel}</div>}
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-primary" />
  </div>
)

const ServiceNode = ({ data }: NodeProps<ServiceNode>) => (
  <div className="px-4 py-2 shadow-lg rounded-md bg-card border border-border text-foreground min-w-[120px] hover:border-muted-foreground transition-colors">
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-muted-foreground" />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-muted/10 rounded-md border border-border">
        <Server className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service</div>
        <div className="text-sm font-mono truncate">{data.label}</div>
        {data.port && <div className="text-[10px] text-accent font-bold uppercase">Port {data.port}</div>}
      </div>
    </div>
  </div>
)

type VulnNodeData = { label: string; severity?: string };
type VulnNode = Node<VulnNodeData, 'vuln'>;

const VulnNode = ({ data }: NodeProps<VulnNode>) => (
  <div className="px-4 py-2 shadow-lg rounded-md bg-card border border-destructive/50 text-foreground min-w-[140px] hover:border-destructive transition-colors animate-subtle-pulse">
    <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-destructive" />
    <div className="flex items-center gap-3">
      <div className="p-2 bg-destructive/10 rounded-md border border-destructive/50">
        <Cpu className="w-4 h-4 text-destructive" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-destructive">Vulnerability</div>
        <div className="text-sm font-mono truncate">{data.label}</div>
        {data.severity && <div className="text-[10px] text-destructive/80 font-bold uppercase">{data.severity}</div>}
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
    onNodesChange, onEdgesChange, setNodes, setEdges, setDiscoveries 
  } = useC2Store()

  const refreshDiscoveries = React.useCallback(async () => {
    if (!connected || !currentSessionId) return
    try {
      const data = await fetchDiscoveries(backendUrl, currentSessionId)
      setDiscoveries(data || [])
    } catch (e) {
      console.error('Failed to sync discoveries:', e)
    }
  }, [connected, backendUrl, currentSessionId, setDiscoveries])

  useEffect(() => {
    refreshDiscoveries()
    const interval = setInterval(refreshDiscoveries, 5000)
    return () => clearInterval(interval)
  }, [refreshDiscoveries])

  // Map discoveries to nodes and edges
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
      const parentTarget = discoveries.find(t => (t.type === 'domain' || t.type === 'ip') && t.source_scan_id === d.source_scan_id)
      
      if (parentTarget) {
        const edgeId = `e-${parentTarget.type}-${parentTarget.id}-${nodeId}`
        if (!existingEdgeIds.has(edgeId)) {
          const isVuln = d.type === 'vuln'
          addedEdges.push({
            id: edgeId,
            source: `${parentTarget.type}-${parentTarget.id}`,
            target: nodeId,
            animated: true,
            style: { 
              stroke: isVuln ? 'var(--destructive)' : 'var(--primary)', 
              strokeWidth: isVuln ? 1.5 : 1,
              opacity: 0.5
            },
          })
        }
      }
    })

    if (addedEdges.length > 0) {
      setEdges([...edges, ...addedEdges])
    }
  }, [discoveries, setNodes, setEdges]) // Intentionally omit nodes/edges to prevent loop, only react to new discoveries

  return (
    <div className="w-full h-full bg-background relative group">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="text-[10px] font-bold text-primary/50 uppercase tracking-[0.2em]">Visual Infrastructure Mapping</div>
        <div className="text-[8px] text-muted-foreground font-mono uppercase">Nodes: {(nodes || []).length} | Edges: {(edges || []).length} | Discoveries: {(discoveries || []).length}</div>
      </div>

      <button 
        onClick={refreshDiscoveries}
        className="absolute top-4 right-4 z-10 p-2 bg-card/50 border border-border rounded-md hover:bg-muted transition-colors"
      >
        <RefreshCw className="w-3 h-3 text-muted-foreground" />
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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

      <div className="absolute inset-0 pointer-events-none bg-tactical-grid opacity-[0.02]" />
    </div>
  )
}
