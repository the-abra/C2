import { useState, useRef, useEffect, useCallback } from "react";
import { type Discovery } from "@/lib/api-service";

export type ProcessStatus = 'idle' | 'running' | 'error' | 'completed' | 'killed' | 'failed'

interface EngineCallbacks {
  onDiscovery?: (discovery: Discovery) => void;
  onNoteUpdate?: (target: string) => void;
  onAIAdvice?: (tool: string, target: string, advice: string) => void;
}

export function useC2Engine(backendUrl: string, enabled: boolean, currentSessionId: number | null, callbacks?: EngineCallbacks) {
  const [allLogs, setAllLogs] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ProcessStatus>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current || !enabled) return;
    
    const wsUrl = `${backendUrl.replace("http", "ws").replace("https", "wss")}/ws`;
    console.log(`[*] Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("[+] Connected to C2 Hub");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Filter by Session ID if present in message
        if (data.session_id && currentSessionId && data.session_id !== currentSessionId) {
          return;
        }

        if (data.type === "log" && data.tool) {
          setAllLogs((prev: Record<string, string>) => ({
            ...prev,
            [data.tool]: (prev[data.tool] || "") + data.payload,
          }));
        } else if (data.type === "status" && data.tool) {
          setStatuses((prev: Record<string, ProcessStatus>) => ({
            ...prev,
            [data.tool]: data.payload as ProcessStatus,
          }));
        } else if (data.type === "discovery" && data.data) {
          // Discoveries carry session_id inside data
          if (data.data.session_id === currentSessionId) {
            callbacks?.onDiscovery?.(data.data as Discovery);
          }
        } else if (data.type === "note_update") {
          callbacks?.onNoteUpdate?.(data.payload);
        } else if (data.type === "ai_advice") {
          callbacks?.onAIAdvice?.(data.tool, data.data?.target || "", data.payload);
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };

    ws.onclose = () => {
      console.log("[-] Disconnected from C2 Hub");
      wsRef.current = null;
      // Auto-reconnect after 3 seconds
      if (enabled) {
        setTimeout(connect, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error("WS Error: Connection failed. Check if backend is running on", backendUrl);
      ws.close();
    };
    
    wsRef.current = ws;
  }, [backendUrl, enabled, callbacks]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  return { allLogs, setAllLogs, statuses, setStatuses };
}
