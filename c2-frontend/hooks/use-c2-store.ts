import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { type Tool, type Category, type AttackProfile, type Discovery, type Scenario } from '@/lib/api-service'
import { type Node, type Edge, type OnNodesChange, type OnEdgesChange, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'

export interface TerminalSession {
  id: string // e.g., 'system', 'nmap', 'shell-1'
  title: string
  type: 'tool' | 'shell' | 'system'
  toolName?: string
}

interface C2State {
  // Connection State
  connected: boolean
  backendUrl: string
  currentSessionId: number | null
  sessions: any[]
  setConnected: (connected: boolean) => void
  setBackendUrl: (url: string) => void
  setCurrentSessionId: (id: number | null) => void
  setSessions: (sessions: any[]) => void

  // Tools & Categories
  tools: Tool[]
  categories: Category[]
  scenarios: Scenario[]
  setTools: (tools: Tool[]) => void
  setCategories: (categories: Category[]) => void
  setScenarios: (scenarios: Scenario[]) => void

  // Selection State
  selectedToolId: number | null
  selectedProfileId: number | null
  selectedScenarioId: number | null
  target: string
  setSelectedToolId: (id: number | null) => void
  setSelectedProfileId: (id: number | null) => void
  setSelectedScenarioId: (id: number | null) => void
  setTarget: (target: string) => void

  // Execution State
  scanIds: Record<string, number>
  setScanId: (toolName: string, id: number) => void
  
  // Visual Graph State
  nodes: Node[]
  edges: Edge[]
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange

  // Discovery State
  discoveries: Discovery[]
  setDiscoveries: (discoveries: Discovery[]) => void

  // Automation State
  autoPilotEnabled: boolean
  setAutoPilotEnabled: (enabled: boolean) => void

  // Uploads State
  uploads: string[]
  setUploads: (uploads: string[]) => void

  // Terminal Dock State
  terminalSessions: TerminalSession[]
  activeTerminalId: string
  addTerminalSession: (session: TerminalSession) => void
  removeTerminalSession: (id: string) => void
  setActiveTerminalId: (id: string) => void

  // Visibility State
  isNotesOpen: boolean
  isAIPanelOpen: boolean
  isAIConfigOpen: boolean
  isShellOpen: boolean
  isEvidenceOpen: boolean
  isUploadsOpen: boolean
  isHistoryOpen: boolean
  isReportOpen: boolean
  isAutomationCenterOpen: boolean
  isAssetLibraryOpen: boolean
  setModalOpen: (modal: string, isOpen: boolean) => void
}

export const useC2Store = create<C2State>()(
  persist(
    (set) => ({
      connected: false,
      backendUrl: 'http://localhost:1453',
      currentSessionId: null,
      sessions: [],
      setConnected: (connected) => set({ connected }),
      setBackendUrl: (backendUrl) => set({ backendUrl }),
      setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
      setSessions: (sessions) => set({ sessions }),

      tools: [],
      categories: [],
      scenarios: [],
      setTools: (tools) => set({ tools }),
      setCategories: (categories) => set({ categories }),
      setScenarios: (scenarios) => set({ scenarios }),

      selectedToolId: null,
      selectedProfileId: null,
      selectedScenarioId: null,
      target: '',
      setSelectedToolId: (selectedToolId) => set({ selectedToolId }),
      setSelectedProfileId: (selectedProfileId) => set({ selectedProfileId }),
      setSelectedScenarioId: (selectedScenarioId) => set({ selectedScenarioId }),
      setTarget: (target) => set({ target }),
      scanIds: {},
      setScanId: (toolName, id) => set((state) => ({ 
        scanIds: { ...state.scanIds, [toolName]: id } 
      })),

      nodes: [],
      edges: [],
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      onNodesChange: (changes) => set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes)
      })),
      onEdgesChange: (changes) => set((state) => ({
        edges: applyEdgeChanges(changes, state.edges)
      })),

      discoveries: [],
      setDiscoveries: (discoveries) => set({ discoveries }),

      autoPilotEnabled: false,
      setAutoPilotEnabled: (autoPilotEnabled) => set({ autoPilotEnabled }),

      uploads: [],
      setUploads: (uploads) => set({ uploads }),

      // Terminal Dock
      terminalSessions: [{ id: 'system', title: 'System', type: 'system' }],
      activeTerminalId: 'system',
      addTerminalSession: (session) => set((state) => {
        if (state.terminalSessions.find(s => s.id === session.id)) {
          return { activeTerminalId: session.id }
        }
        return { 
          terminalSessions: [...state.terminalSessions, session],
          activeTerminalId: session.id
        }
      }),
      removeTerminalSession: (id) => set((state) => {
        const filtered = state.terminalSessions.filter(s => s.id !== id)
        let nextId = state.activeTerminalId
        if (state.activeTerminalId === id) {
          nextId = filtered.length > 0 ? filtered[filtered.length - 1].id : ''
        }
        return { 
          terminalSessions: filtered,
          activeTerminalId: nextId
        }
      }),
      setActiveTerminalId: (activeTerminalId) => set({ activeTerminalId }),

      isNotesOpen: false,
      isAIPanelOpen: false,
      isAIConfigOpen: false,
      isShellOpen: false,
      isEvidenceOpen: false,
      isUploadsOpen: false,
      isHistoryOpen: false,
      isReportOpen: false,
      isAutomationCenterOpen: false,
      isAssetLibraryOpen: false,
      setModalOpen: (modal, isOpen) => set((state) => ({ 
        ...state,
        [`is${modal.charAt(0).toUpperCase() + modal.slice(1)}Open`]: isOpen 
      })),
    }),
    {
      name: 'c2-tactical-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        backendUrl: state.backendUrl, 
        currentSessionId: state.currentSessionId,
        target: state.target,
        terminalSessions: state.terminalSessions,
        activeTerminalId: state.activeTerminalId
      }),
    }
  )
)
