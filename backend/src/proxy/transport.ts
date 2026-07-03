import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { type TransportAdapter, type JsonRpcMessage, type ProxyConfig } from './types.js';

async function readBodyText(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body) {
    return response.text();
  }

  const isSse = (response.headers.get('content-type') || '').includes('text/event-stream');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const readResult = reader.read();
      const abortSignal = new Promise<never>((_, reject) => {
        function onAbort() {
          reject(new DOMException('Response body read aborted', 'AbortError'));
        }
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      });

      const { done, value } = await Promise.race([readResult, abortSignal]);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      if (isSse && buffer.includes('\n\n')) {
        reader.cancel().catch(() => {});
        return buffer;
      }
    }
    return buffer;
  } finally {
    reader.cancel().catch(() => {});
  }
}

class StdioTransport implements TransportAdapter {
  private proc: ChildProcess | null = null;
  private messageHandler: ((msg: JsonRpcMessage) => void) | null = null;
  private disconnectHandler: (() => void) | null = null;
  private errorHandler: ((err: Error) => void) | null = null;
  private command: string;
  private args: string[];
  private accessToken?: string;
  private env?: Record<string, string>;

  constructor(command: string, args: string[] = [], accessToken?: string, env?: Record<string, string>) {
    this.command = command;
    this.args = args;
    this.accessToken = accessToken;
    this.env = env;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proc = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...this.env,
          ...(this.accessToken ? { WEIR_MCP_ACCESS_TOKEN: this.accessToken } : {}),
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error('Backend connection timeout'));
      }, parseInt(process.env['WEIR_PROXY_BACKEND_TIMEOUT'] || '5000', 10));

      this.proc.on('spawn', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.proc.on('error', (err) => {
        clearTimeout(timeout);
        this.errorHandler?.(err);
        reject(err);
      });

      this.proc.on('close', (code) => {
        if (code !== null && code !== 0) {
          this.disconnectHandler?.();
        }
      });

      if (this.proc.stdout) {
        const rl = createInterface({ input: this.proc.stdout, crlfDelay: Infinity });
        rl.on('line', (line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          try {
            const msg = JSON.parse(trimmed) as JsonRpcMessage;
            this.messageHandler?.(msg);
          } catch {
            process.stderr.write(`[transport] Malformed JSON-RPC from backend: ${trimmed}\n`);
          }
        });
      }
    });
  }

  disconnect(): void {
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
    this.proc = null;
  }

  async send(message: JsonRpcMessage): Promise<void> {
    if (!this.proc || !this.proc.stdin || this.proc.killed) {
      throw new Error('Transport is disconnected');
    }
    this.proc.stdin.write(JSON.stringify(message) + '\n');
  }

  onMessage(handler: (msg: JsonRpcMessage) => void): void {
    this.messageHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandler = handler;
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }
}

class SSETransport implements TransportAdapter {
  private messageHandler: ((msg: JsonRpcMessage) => void) | null = null;
  private disconnectHandler: (() => void) | null = null;
  private errorHandler: ((err: Error) => void) | null = null;
  private url: string;
  private abortController: AbortController | null = null;
  private connected = false;
  private accessToken?: string;

  constructor(url: string, accessToken?: string) {
    this.url = url.replace(/\/+$/, '');
    this.accessToken = accessToken;
  }

  async connect(): Promise<void> {
    this.abortController = new AbortController();
    const timeout = parseInt(process.env['WEIR_PROXY_BACKEND_TIMEOUT'] || '5000', 10);
    const timeoutId = setTimeout(() => this.abortController?.abort(), timeout);

    try {
      const headers: Record<string, string> = { Accept: 'text/event-stream' };
      if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
      const response = await fetch(this.url, {
        signal: this.abortController.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.connected = true;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const readLoop = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (!data) continue;
                try {
                  const msg = JSON.parse(data) as JsonRpcMessage;
                  this.messageHandler?.(msg);
                } catch {
                  process.stderr.write(`[transport] Malformed JSON-RPC from SSE backend: ${data}\n`);
                }
              }
            }
          }

        } catch {
          /* stream ended */
        }
        this.connected = false;
        this.disconnectHandler?.();
      };

      readLoop();
    } catch (err) {
      clearTimeout(timeoutId);
      this.connected = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandler?.(error);
      throw error;
    }
  }

  disconnect(): void {
    this.connected = false;
    this.abortController?.abort();
    this.abortController = null;
  }

  async send(message: JsonRpcMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport is disconnected');
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    const response = await fetch(`${this.url}/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} sending message`);
    }
  }

  onMessage(handler: (msg: JsonRpcMessage) => void): void {
    this.messageHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandler = handler;
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }
}

class HttpTransport implements TransportAdapter {
  private messageHandler: ((msg: JsonRpcMessage) => void) | null = null;
  private disconnectHandler: (() => void) | null = null;
  private errorHandler: ((err: Error) => void) | null = null;
  private url: string;
  private connected = false;
  private accessToken?: string;
  private initialized = false;
  private sessionId: string | null = null;

  constructor(url: string, accessToken?: string) {
    this.url = url.replace(/\/+$/, '');
    this.accessToken = accessToken;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream, application/json',
    };
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  async send(message: JsonRpcMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport is disconnected');
    }

    const timeout = parseInt(process.env['WEIR_PROXY_BACKEND_TIMEOUT'] || '5000', 10);

    if (!this.initialized && message.method !== 'initialize') {
      const initBody = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'weir-proxy', version: '0.1.0' },
        },
      };
      const initAbort = new AbortController();
      const initTimeout = setTimeout(() => initAbort.abort(), timeout);
      try {
        const initRes = await fetch(this.url, {
          signal: initAbort.signal,
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(initBody),
        });
        if (initRes.ok) {
          this.sessionId = initRes.headers.get('mcp-session-id') || null;
        }
        initRes.body?.cancel();
      } catch {
        // If initialize fails, continue anyway
      } finally {
        clearTimeout(initTimeout);
      }
      this.initialized = true;
    }

    // Build headers with session ID if present
    const reqHeaders = { ...this.headers };
    if (this.sessionId) {
      reqHeaders['MCP-Session-ID'] = this.sessionId;
    }

    const msgAbort = new AbortController();
    const msgTimeout = setTimeout(() => msgAbort.abort(), timeout);
    try {
      const response = await fetch(this.url, {
        signal: msgAbort.signal,
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(message),
      });

      if (message.method === 'initialize' && response.ok) {
        this.sessionId = response.headers.get('mcp-session-id') || null;
        this.initialized = true;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await readBodyText(response, msgAbort.signal);
      if (text) {
        // Handle SSE-formatted responses (event: message\ndata: {json})
        let jsonStr = text;
        if (text.startsWith('event: message')) {
          const dataMatch = text.match(/^data: (.+)$/m);
          if (dataMatch) jsonStr = dataMatch[1];
        }
        try {
          const msg = JSON.parse(jsonStr) as JsonRpcMessage;
          this.messageHandler?.(msg);
        } catch {
          process.stderr.write(`[transport] Malformed JSON-RPC from HTTP backend: ${text}\n`);
        }
      }
    } catch (err) {
      this.disconnectHandler?.();
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorHandler?.(error);
      throw error;
    } finally {
      clearTimeout(msgTimeout);
    }
  }

  onMessage(handler: (msg: JsonRpcMessage) => void): void {
    this.messageHandler = handler;
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandler = handler;
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandler = handler;
  }
}

export function createTransport(config: ProxyConfig): TransportAdapter {
  switch (config.transport) {
    case 'stdio': {
      if (!config.command) throw new Error('stdio transport requires command');
      return new StdioTransport(config.command, config.args || [], config.accessToken, config.env);
    }
    case 'sse': {
      if (!config.url) throw new Error('SSE transport requires url');
      return new SSETransport(config.url, config.accessToken);
    }
    case 'http': {
      if (!config.url) throw new Error('HTTP transport requires url');
      return new HttpTransport(config.url, config.accessToken);
    }
    default:
      throw new Error(`Unknown transport type: ${config.transport}`);
  }
}
