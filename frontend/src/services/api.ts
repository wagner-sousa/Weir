import { notifyError } from './notifications';

const API_BASE = '/api';
const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;

export interface MCPClient {
  name: string;
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
}

export interface MCPResponse {
  clients: MCPClient[];
  error: string | null;
  timestamp: string;
}

export async function fetchMCPs(): Promise<MCPResponse> {
  const res = await fetch(`${API_BASE}/mcps`);
  if (!res.ok) {
    const message = `HTTP ${res.status}: ${res.statusText}`;
    notifyError(message);
    throw new Error(message);
  }
  return res.json();
}

export function connectWebSocket(onConfigChanged: () => void): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'config:changed') {
          onConfigChanged();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
