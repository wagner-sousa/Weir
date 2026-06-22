const API_BASE = '/api';
const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;

export interface MCPClient {
  name: string;
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export interface MCPResponse {
  clients: MCPClient[];
  error: string | null;
  timestamp: string;
}

export interface TransportConfig {
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
}

export async function fetchMCPs(): Promise<MCPResponse> {
  const res = await fetch(`${API_BASE}/mcps`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function testConnection(
  transport: TransportConfig,
  signal?: AbortSignal,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/mcps/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transport }),
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.error || `HTTP ${res.status}` };
  }
  return res.json();
}

export async function addMCP(
  name: string,
  transport: TransportConfig,
): Promise<{ success: boolean; name?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/mcps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, transport }),
  });
  const body = await res.json();
  if (!res.ok) {
    return { success: false, error: body.error || `HTTP ${res.status}` };
  }
  return body;
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
