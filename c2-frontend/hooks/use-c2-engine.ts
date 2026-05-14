import { useState, useRef, useEffect, useCallback } from "react";

export type ProcessStatus = 'idle' | 'running' | 'error' | 'completed' | 'killed' | 'failed'

export function useC2Engine(backendUrl: string, enabled: boolean) {
  const [allLogs, setAllLogs] = useState<Record<string, string[]>>({});
  const [statuses, setStatuses] = useState<Record<string, ProcessStatus>>({});
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current || !enabled) return;
    const wsUrl = `${backendUrl.replace("http", "ws").replace("https", "wss")}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log" && data.tool) {
          setAllLogs((prev) => ({
            ...prev,
            [data.tool]: [...(prev[data.tool] || []), data.payload],
          }));
        } else if (data.type === "status" && data.tool) {
          setStatuses((prev) => ({
            ...prev,
            [data.tool]: data.payload as ProcessStatus,
          }));
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };
    
    wsRef.current = ws;
  }, [backendUrl, enabled]);

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
