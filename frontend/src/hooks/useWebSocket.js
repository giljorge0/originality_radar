// frontend/src/hooks/useWebSocket.js
// Feature 3: Live multiplayer map via WebSockets
// Connects to the backend WS server and calls onNewIdea whenever another
// user submits an idea, so the map updates in real-time without polling.

import { useEffect, useRef, useCallback } from 'react';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  .replace(/^http/, 'ws') + '/ws';

export default function useWebSocket({ onNewIdea } = {}) {
  const wsRef         = useRef(null);
  const reconnectRef  = useRef(null);
  const mountedRef    = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WS connected');
        // Clear any pending reconnect
        if (reconnectRef.current) {
          clearTimeout(reconnectRef.current);
          reconnectRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'NEW_IDEA' && onNewIdea) {
            onNewIdea(msg.payload);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        // Exponential backoff reconnect (max 30s)
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    } catch {
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, [onNewIdea]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Expose connection status via a readable ref
  const isConnected = () => wsRef.current?.readyState === WebSocket.OPEN;
  return { isConnected };
}
