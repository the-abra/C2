'use client'

export interface Tool {
  id: number
  name: string
  category: string
  description: string
  default_binary_name: string
  is_installed: boolean
  profiles?: AttackProfile[]
}

export interface Category {
  label: string
  tools: Tool[]
}

export interface AttackProfile {
  id: number
  tool_id: number
  name: string
  args: string[]
  rationale?: string
}

export interface Discovery {
  id: number
  session_id: number
  type: 'domain' | 'ip' | 'service' | 'vuln'
  value: string
  metadata: string
  source_scan_id: number
  created_at: string
}

export interface Session {
  id: number
  name: string
  target: string
  created_at: string
  last_accessed_at: string
}

export interface ScenarioStep {
  id: number
  scenario_id: number
  order_index: number
  tool_id: number
  tool_name?: string
  profile_id: number
  profile_name?: string
  wait_for_previous: boolean
  auto_propagate_targets: boolean
}

export interface Scenario {
  id: number
  name: string
  description: string
  category: string
  steps: ScenarioStep[]
}

export interface ExecutionRequest {
  sessionId: number
  toolId: number
  profileId: number
  target: string
  params?: Record<string, string>
}

export async function fetchTools(backendUrl: string): Promise<Tool[]> {
  const response = await fetch(`${backendUrl}/api/tools`)
  if (!response.ok) throw new Error('Failed to fetch tools')
  return response.json()
}

export async function connectToBackend(url: string) {
  const response = await fetch(`${url}/api/status`)
  if (!response.ok) throw new Error('Connection failed')
  return response.json()
}

export async function runTool(request: ExecutionRequest, backendUrl: string) {
  const response = await fetch(`${backendUrl}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: request.sessionId,
      tool_id: request.toolId,
      profile_id: request.profileId,
      target: request.target,
      params: request.params || {},
    }),
  })
  if (!response.ok) throw new Error('Failed to start tool')
  return response.json()
}

export async function killScan(scanId: number, backendUrl: string) {
  const response = await fetch(`${backendUrl}/api/kill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scan_id: scanId }),
  })
  return response.ok
}

export async function fetchDiscoveries(backendUrl: string, sessionId: number): Promise<Discovery[]> {
  const response = await fetch(`${backendUrl}/api/discoveries?session_id=${sessionId}`)
  if (!response.ok) throw new Error('Failed to fetch discoveries')
  return response.json()
}

export async function fetchAutomationStatus(backendUrl: string): Promise<{ is_enabled: boolean }> {
  const response = await fetch(`${backendUrl}/api/automation`)
  if (!response.ok) throw new Error('Failed to fetch automation status')
  return response.json()
}

export async function toggleAutomation(isEnabled: boolean, backendUrl: string): Promise<boolean> {
  const response = await fetch(`${backendUrl}/api/automation/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_enabled: isEnabled }),
  })
  return response.ok
}

export async function fetchReport(backendUrl: string, sessionId: number): Promise<string> {
  const response = await fetch(`${backendUrl}/api/report?session_id=${sessionId}`)
  if (!response.ok) throw new Error('Failed to fetch report')
  return response.text()
}

export async function fetchHistory(backendUrl: string, sessionId: number): Promise<any[]> {
  const response = await fetch(`${backendUrl}/api/history?session_id=${sessionId}`)
  if (!response.ok) throw new Error('Failed to fetch history')
  return response.json()
}

export async function fetchNote(backendUrl: string, sessionId: number, target: string): Promise<{ content: string }> {
  const response = await fetch(`${backendUrl}/api/notes?session_id=${sessionId}&target=${target}`)
  if (!response.ok) throw new Error('Failed to fetch note')
  return response.json()
}

export async function saveNote(backendUrl: string, sessionId: number, target: string, content: string): Promise<boolean> {
  const response = await fetch(`${backendUrl}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, target, content }),
  })
  return response.ok
}

export async function fetchSessions(backendUrl: string): Promise<Session[]> {
  const response = await fetch(`${backendUrl}/api/sessions`)
  if (!response.ok) throw new Error('Failed to fetch sessions')
  return response.json()
}

export async function createSession(backendUrl: string, name: string, target: string): Promise<{ id: number }> {
  const response = await fetch(`${backendUrl}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, target }),
  })
  if (!response.ok) throw new Error('Failed to create session')
  return response.json()
}

export async function deleteSession(backendUrl: string, id: number): Promise<boolean> {
  const response = await fetch(`${backendUrl}/api/sessions?id=${id}`, {
    method: 'DELETE',
  })
  return response.ok
}

export async function fetchScenarios(backendUrl: string): Promise<Scenario[]> {
  const response = await fetch(`${backendUrl}/api/scenarios`)
  if (!response.ok) throw new Error('Failed to fetch scenarios')
  return response.json()
}

export async function runScenario(backendUrl: string, sessionId: number, scenarioId: number, target: string, params?: Record<string, string>) {
  const response = await fetch(`${backendUrl}/api/scenarios/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      scenario_id: scenarioId,
      target: target,
      params: params || {},
    }),
  })
  if (!response.ok) throw new Error('Failed to start scenario')
  return response.json()
}

export async function createScenario(backendUrl: string, scenario: Omit<Scenario, 'id'>): Promise<Scenario> {
  const response = await fetch(`${backendUrl}/api/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  })
  if (!response.ok) throw new Error('Failed to create scenario')
  return response.json()
}

export async function deleteScenario(backendUrl: string, id: number): Promise<boolean> {
  const response = await fetch(`${backendUrl}/api/scenarios?id=${id}`, {
    method: 'DELETE',
  })
  return response.ok
}

export interface LogMessage {
  id: string
  tool: string
  text: string
  type: 'info' | 'success' | 'warning' | 'error' | 'data' | 'system' | 'cmd'
  timestamp: string
}

export function compileTargetContext(allLogs: Record<string, any[]>): string {
  const sections: string[] = []
  for (const [toolName, logs] of Object.entries(allLogs)) {
    if (logs.length === 0) continue
    sections.push(`\n=== Tool ${toolName} Output ===\n`)
    logs.slice(-50).forEach(log => {
      sections.push(`[${log.timestamp}] ${log.text}`)
    })
  }
  return sections.join('\n')
}
