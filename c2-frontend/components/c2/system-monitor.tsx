'use client'

import React, { useEffect, useState } from 'react'
import { Cpu, HardDrive, Activity, Trash2, Play, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveJob {
  id: number
  session_id: number
  tool: string
  target: string
}

interface SystemStats {
  cpu_percent: number
  ram_percent: number
  ram_total_mb: number
  ram_used_mb: number
  disk_percent: number
  disk_total_gb: number
  disk_used_gb: number
  active_jobs: ActiveJob[]
}

interface SystemMonitorProps {
  backendUrl: string
}

export function SystemMonitor({ backendUrl }: SystemMonitorProps) {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStats = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const res = await fetch(`${backendUrl}/api/system/stats`)
      if (!res.ok) throw new Error('Failed to capture resource stats')
      const data = await res.json()
      setStats(data)
      setError(null)
    } catch (err: any) {
      console.error('System Monitor error:', err)
      setError('Target platform unreachable or system monitor blocked.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(() => fetchStats(), 2500)
    return () => clearInterval(interval)
  }, [backendUrl])

  const killJob = async (jobId: number, toolName: string) => {
    if (!confirm(`Are you sure you want to forcibly terminate the active background "${toolName}" process?`)) return
    try {
      const res = await fetch(`${backendUrl}/api/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: jobId })
      })
      if (res.ok) {
        // Refresh stats immediately
        fetchStats()
      } else {
        alert('Failed to kill subprocess.')
      }
    } catch (e) {
      console.error('Failed to kill subprocess:', e)
    }
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0c] gap-3">
        <Activity className="size-8 text-primary animate-pulse" />
        <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase animate-pulse">CONNECTING KERNEL SYS-MONITOR...</span>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0c] gap-3 px-4 text-center">
        <AlertCircle className="size-8 text-destructive animate-bounce" />
        <span className="text-xs font-mono text-destructive uppercase tracking-wider">{error || 'Failed to read resources.'}</span>
        <button
          onClick={() => { setLoading(true); fetchStats() }}
          className="mt-2 px-3 py-1.5 border border-border hover:bg-muted/10 font-mono text-[9px] uppercase tracking-widest rounded"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  const { cpu_percent, ram_percent, ram_total_mb, ram_used_mb, disk_percent, disk_total_gb, disk_used_gb, active_jobs } = stats

  // Round metrics cleanly
  const cpuVal = Math.round(cpu_percent)
  const ramVal = Math.round(ram_percent)
  const diskVal = Math.round(disk_percent)

  return (
    <div className="w-full h-full bg-[#0a0a0c] flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-sm font-black font-mono tracking-widest uppercase text-foreground">SYSTEM MONITOR HUD</h2>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider opacity-60">Real-time C2 sandboxed platform engine utilization</p>
        </div>

        <button
          onClick={() => fetchStats(true)}
          className={cn(
            "p-2 bg-card/40 border border-border hover:bg-muted/10 rounded-md transition-all",
            isRefreshing && "animate-spin text-primary"
          )}
          title="Force telemetry refresh"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {/* Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
        {/* CPU Utilization Widget */}
        <div className="bg-card/25 border border-border/40 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <Cpu className="size-4 text-primary" />
              </div>
              <span className="text-xs font-black font-mono uppercase tracking-wider">CPU UTILIZATION</span>
            </div>
            <span className="font-mono text-sm font-black text-primary">{cpuVal}%</span>
          </div>

          <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-border/50 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-500 shadow-sm shadow-primary/20"
              style={{ width: `${Math.max(cpuVal, 2)}%` }}
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground uppercase opacity-70">
            <span>Dynamic Speed</span>
            <span>{cpuVal > 80 ? 'HIGH THREAD LOAD' : 'SAFE'}</span>
          </div>
        </div>

        {/* RAM Widget */}
        <div className="bg-card/25 border border-border/40 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-cyan-500/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Activity className="size-4 text-cyan-400" />
              </div>
              <span className="text-xs font-black font-mono uppercase tracking-wider">SYSTEM MEMORY</span>
            </div>
            <span className="font-mono text-sm font-black text-cyan-400">{ramVal}%</span>
          </div>

          <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-border/50 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 shadow-sm shadow-cyan-500/20"
              style={{ width: `${Math.max(ramVal, 2)}%` }}
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground uppercase opacity-70">
            <span>RAM Used: {Math.round(ram_used_mb)} MB</span>
            <span>Total: {Math.round(ram_total_mb)} MB</span>
          </div>
        </div>

        {/* Disk Storage Widget */}
        <div className="bg-card/25 border border-border/40 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <HardDrive className="size-4 text-emerald-400" />
              </div>
              <span className="text-xs font-black font-mono uppercase tracking-wider">STORAGE POOL</span>
            </div>
            <span className="font-mono text-sm font-black text-emerald-400">{diskVal}%</span>
          </div>

          <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden border border-border/50 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/20"
              style={{ width: `${Math.max(diskVal, 2)}%` }}
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground uppercase opacity-70">
            <span>Used: {disk_used_gb} GB</span>
            <span>Available: {disk_total_gb} GB</span>
          </div>
        </div>
      </div>

      {/* Active Running Processes */}
      <div className="flex-1 min-h-[300px] bg-card/10 border border-border/40 rounded-xl flex flex-col overflow-hidden">
        <div className="bg-card/30 border-b border-border/40 px-5 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-black font-mono uppercase tracking-wider">ACTIVE PIPELINES & RUNNING PROCESSES</span>
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest opacity-60">Real-time subprocess command lines and jobs</p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 font-mono text-[9px] font-black text-primary uppercase">
            {active_jobs.length} ACTIVE {active_jobs.length === 1 ? 'JOB' : 'JOBS'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {active_jobs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center py-16 gap-2 opacity-55">
              <Activity className="size-6 text-muted-foreground/45" />
              <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">ZERO SUBPROCESS RUNNING — STANDBY MODE</span>
            </div>
          ) : (
            <table className="w-full border-collapse font-mono text-[10px]">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground text-left bg-muted/5 uppercase tracking-wider">
                  <th className="px-6 py-3 font-black text-[9px]">SCAN ID</th>
                  <th className="px-6 py-3 font-black text-[9px]">MISSION SESSION</th>
                  <th className="px-6 py-3 font-black text-[9px]">UTILITY/TOOL</th>
                  <th className="px-6 py-3 font-black text-[9px]">TARGET ENDPOINT</th>
                  <th className="px-6 py-3 font-black text-[9px] text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {active_jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/20 hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-4 text-primary font-bold">#{job.id}</td>
                    <td className="px-6 py-4 text-muted-foreground">Session #{job.session_id}</td>
                    <td className="px-6 py-4 font-black">
                      <span className="px-1.5 py-0.5 rounded bg-black/60 border border-border text-[9px] tracking-wide text-foreground uppercase">
                        {job.tool}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-bold truncate max-w-xs">{job.target}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => killJob(job.id, job.tool)}
                        className="px-2.5 py-1 text-[8px] bg-destructive/10 border border-destructive/20 text-destructive font-black uppercase rounded hover:bg-destructive hover:text-white transition-all inline-flex items-center gap-1 shadow-sm"
                        title="Force kill active subprocess"
                      >
                        <Trash2 className="size-2.5" /> TERMINATE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
