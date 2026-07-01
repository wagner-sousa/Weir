import { notifyError } from './notifications';

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
  status?: 'connecting' | 'connected' | 'error' | 'disconnected' | 'testing' | 'unknown';
  error?: string | null;
  toolCount?: number;
  needsAuth?: boolean;
  authUrl?: string;
}

export interface MCPResponse {
  clients: MCPClient[];
  error: string | null;
  timestamp: string;
  mcpPort?: number;
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
  status: 'connecting' | 'connected' | 'error' | 'disconnected' | 'testing' | 'unknown';
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
    const message = `HTTP ${res.status}: ${res.statusText}`;
    notifyError(message);
    throw new Error(message);
  }
  return res.json();
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  needsAuth?: boolean;
  authUrl?: string;
}

export async function testConnection(
  transport: TransportConfig,
  signal?: AbortSignal,
  name?: string,
): Promise<TestConnectionResult> {
  const res = await fetch(`${API_BASE}/mcps/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transport, name }),
    signal,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.error || `HTTP ${res.status}` };
  }
  return res.json();
}

export interface SaveMCPResult {
  success: boolean;
  name?: string;
  error?: string;
  testResult?: TestConnectionResult;
}

export async function addMCP(
  name: string,
  transport: TransportConfig,
  signal?: AbortSignal,
): Promise<SaveMCPResult> {
  const res = await fetch(`${API_BASE}/mcps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, transport }),
    signal,
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

export async function removeMCP(
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/mcps/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  const body = await res.json();
  if (!res.ok) {
    return { success: false, error: body.error || `HTTP ${res.status}` };
  }
  return body;
}

export async function updateMCP(
  originalName: string,
  name: string,
  transport: TransportConfig,
): Promise<SaveMCPResult> {
  const res = await fetch(`${API_BASE}/mcps/${encodeURIComponent(originalName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, transport }),
  });
  const body = await res.json();
  if (!res.ok) {
    return { success: false, error: body.error || `HTTP ${res.status}` };
  }
  return body;
}

export function connectWebSocket(
  onConfigChanged: () => void,
  onStatusEvent?: (event: StatusEvent) => void,
): () => void {
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
        } else if (msg.event === 'status' && onStatusEvent) {
          onStatusEvent(msg.data as StatusEvent);
        }
        if (msg.event === 'status' && onStatusEvent) {
          onStatusEvent(msg.data);
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

  source.addEventListener('testing', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      onStatusEvent({ name: data.name, status: 'testing', toolCount: null, error: null });
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
