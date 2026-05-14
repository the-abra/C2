/**
 * C2 API Service Layer
 */

// Types
export interface AttackProfile {
  id: number
  tool_id: number
  name: string
  args: string[]
}

export interface Tool {
  id: number
  name: string
  category: string
  description: string
  default_binary_name: string
  profiles?: AttackProfile[]
}

export interface Category {
  label: string
  tools: Tool[]
}

export interface LogLine {
  id: number
  text: string
  type: 'info' | 'success' | 'warning' | 'error' | 'data' | 'system' | 'cmd'
  timestamp: string
}

export interface ExecutionRequest {
  toolId: number
  profileId: number
  target: string
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
      tool_id: request.toolId,
      profile_id: request.profileId,
      target: request.target,
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

export function compileTargetContext(allLogs: Record<string, any[]>): string {
  const sections: string[] = []
  for (const [toolName, logs] of Object.entries(allLogs)) {
    if (logs.length === 0) continue
    sections.push(`\n=== Tool ${toolName} Output ===\n`)
    sections.push(logs.join('\n'))
  }
  return `# Intelligence Report\n${sections.join('\n')}`
}
