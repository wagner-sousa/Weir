export enum ProxyState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  BUFFERING = 'BUFFERING',
  DRAINING = 'DRAINING',
  CLOSED = 'CLOSED',
}

export type BackendTransport = 'stdio' | 'sse' | 'http';

export interface ProxyConfig {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  transport: BackendTransport;
  accessToken?: string;
}

export interface ProxyOptions {
  reconnectBaseDelay: number;
  reconnectMaxDelay: number;
  reconnectMaxRetries: number;
  bufferLimit: number;
  backendTimeout: number;
  keepaliveMs: number;
}

export function defaultProxyOptions(): ProxyOptions {
  return {
    reconnectBaseDelay: parseInt(process.env['WEIR_PROXY_RECONNECT_BASE_DELAY'] || '1000', 10),
    reconnectMaxDelay: parseInt(process.env['WEIR_PROXY_RECONNECT_MAX_DELAY'] || '30000', 10),
    reconnectMaxRetries: parseInt(process.env['WEIR_PROXY_RECONNECT_MAX_RETRIES'] || '10', 10),
    bufferLimit: parseInt(process.env['WEIR_PROXY_BUFFER_LIMIT'] || '100', 10),
    backendTimeout: parseInt(process.env['WEIR_PROXY_BACKEND_TIMEOUT'] || '5000', 10),
    keepaliveMs: parseInt(process.env['WEIR_PROXY_KEEPALIVE_MS'] || '15000', 10),
  };
}

export interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface TransportAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  send(message: JsonRpcMessage): Promise<void>;
  onMessage(handler: (msg: JsonRpcMessage) => void): void;
  onDisconnect(handler: () => void): void;
  onError(handler: (err: Error) => void): void;
}

export interface MessageBuffer {
  queue: JsonRpcMessage[];
  limit: number;
  push(msg: JsonRpcMessage): void;
  drain(): JsonRpcMessage[];
  readonly size: number;
  readonly dropped: number;
}

export interface BackoffState {
  attempt: number;
  baseDelay: number;
  maxDelay: number;
  maxRetries: number;
  nextDelay(): number;
  reset(): void;
}

export interface ProxySession {
  state: ProxyState;
  config: ProxyConfig;
  transport: TransportAdapter;
  buffer: MessageBuffer;
  retryCount: number;
  retryTimer?: ReturnType<typeof setTimeout>;
  startedAt: Date;
}

export interface StatusEvent {
  name: string;
  status: 'connected' | 'reconnecting' | 'error' | 'closed';
  error?: string;
  toolCount?: number;
}
