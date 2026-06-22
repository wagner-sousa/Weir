const API_BASE = '/api';
const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;
const SSE_URL = `${API_BASE}/mcps/events`;

export interface MCPClient {
  name: string;
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  status?: 'connecting' | 'connected' | 'error' | 'disconnected';
  error?: string | null;
  toolCount?: number;
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

export interface StatusEvent {
  name: string;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  toolCount: number | null;
  error: string | null;
}

export interface ToolsResponse {
  tools: Array<{ name: string; description?: string }>;
  count: number;
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

export async function getMCPTools(
  name: string,
): Promise<ToolsResponse> {
  const res = await fetch(`${API_BASE}/mcps/${encodeURIComponent(name)}/tools`);
  if (!res.ok) {
    return { tools: [], count: 0 };
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

export function connectSSE(onStatusEvent: (event: StatusEvent) => void): () => void {
  const source = new EventSource(SSE_URL);

  source.addEventListener('status', (e: MessageEvent) => {
    try {
      const data: StatusEvent = JSON.parse(e.data);
      onStatusEvent(data);
    } catch {
      // ignore malformed events
    }
  });

  source.onerror = () => {
    // SSE will auto-reconnect
  };

  return () => {
    source.close();
  };
}
