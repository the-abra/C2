import { useState, useRef, useEffect, useCallback } from "react";
import { type Discovery } from "@/lib/api-service";

export type ProcessStatus = 'idle' | 'running' | 'error' | 'completed' | 'killed' | 'failed'

interface EngineCallbacks {
  onDiscovery?: (discovery: Discovery) => void;
  onNoteUpdate?: (target: string) => void;
  onHeuristicAdvice?: (tool: string, advice: any) => void;
  onStatusChange?: (tool: string, status: ProcessStatus) => void;
}

const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 15000;

export function useC2Engine(backendUrl: string, enabled: boolean, currentSessionId: number | null, callbacks?: EngineCallbacks) {
  const [allLogs, setAllLogs] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ProcessStatus>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current || !enabled) return;
    
    const wsUrl = `${backendUrl.replace("http", "ws").replace("https", "wss")}/ws`;
    console.log(`[*] Connecting to ${wsUrl}... (attempt ${reconnectAttempt.current + 1})`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("[+] Connected to C2 Hub");
      // Reset backoff on successful connection
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (event) => {
      const lines = (event.data || "").split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          
          // Filter by Session ID if present in message
          if (data.session_id && currentSessionId && data.session_id !== currentSessionId) {
            continue;
          }

          if (data.type === "log" && data.tool) {
            const toolKey = data.tool.toLowerCase();
            setAllLogs((prev: Record<string, string>) => ({
              ...prev,
              [toolKey]: (prev[toolKey] || "") + data.payload,
            }));
          } else if (data.type === "status" && data.tool) {
            const toolKey = data.tool.toLowerCase();
            setStatuses((prev: Record<string, ProcessStatus>) => ({
              ...prev,
              [toolKey]: data.payload as ProcessStatus,
            }));
            callbacks?.onStatusChange?.(toolKey, data.payload as ProcessStatus);
          } else if (data.type === "discovery" && data.data) {
            // Discoveries carry session_id inside data
            if (data.data.session_id === currentSessionId) {
              callbacks?.onDiscovery?.(data.data as Discovery);
            }
          } else if (data.type === "note_update") {
            callbacks?.onNoteUpdate?.(data.payload);
          } else if (data.type === "heuristic_advice") {
            callbacks?.onHeuristicAdvice?.(data.tool, data.data);
          }
        } catch (err) {
          console.warn("WS Parse error", err, "Line content:", line);
        }
      }
    };

    ws.onclose = () => {
      console.log("[-] Disconnected from C2 Hub");
      wsRef.current = null;

      if (enabled) {
        // Exponential backoff with random jitter to prevent thundering herd
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current),
          RECONNECT_MAX_MS
        );
        const jitter = delay * 0.3 * Math.random(); // up to 30% jitter
        const finalDelay = Math.round(delay + jitter);

        console.log(`[*] Reconnecting in ${finalDelay}ms...`);
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(connect, finalDelay);
      }
    };

    ws.onerror = (err) => {
      console.warn("WS Error: Connection failed. Check if backend is running on", backendUrl);
      ws.close();
    };
    
    wsRef.current = ws;
  }, [backendUrl, enabled, callbacks]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      // Clean up both the socket and any pending reconnect timer
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  return { allLogs, setAllLogs, statuses, setStatuses };
}
