import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { type TransportAdapter, type JsonRpcMessage } from './types.js';

class StdioTransport implements TransportAdapter {
  private proc: ChildProcess | null = null;
  private messageHandler: ((msg: JsonRpcMessage) => void) | null = null;
  private disconnectHandler: (() => void) | null = null;
  private errorHandler: ((err: Error) => void) | null = null;
  private command: string;
  private args: string[];

  constructor(command: string, args: string[] = []) {
    this.command = command;
    this.args = args;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proc = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
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

  constructor(url: string) {
    this.url = url.replace(/\/+$/, '');
  }

  async connect(): Promise<void> {
    this.abortController = new AbortController();
    const timeout = parseInt(process.env['WEIR_PROXY_BACKEND_TIMEOUT'] || '5000', 10);
    const timeoutId = setTimeout(() => this.abortController?.abort(), timeout);

    try {
      const response = await fetch(this.url, {
        signal: this.abortController.signal,
        headers: { Accept: 'text/event-stream' },
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
    const response = await fetch(`${this.url}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  constructor(url: string) {
    this.url = url.replace(/\/+$/, '');
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
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (text) {
        try {
          const msg = JSON.parse(text) as JsonRpcMessage;
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

export function createTransport(config: { command?: string; args?: string[]; url?: string; transport: string }): TransportAdapter {
  switch (config.transport) {
    case 'stdio': {
      if (!config.command) throw new Error('stdio transport requires command');
      return new StdioTransport(config.command, config.args || []);
    }
    case 'sse': {
      if (!config.url) throw new Error('SSE transport requires url');
      return new SSETransport(config.url);
    }
    case 'http': {
      if (!config.url) throw new Error('HTTP transport requires url');
      return new HttpTransport(config.url);
    }
    default:
      throw new Error(`Unknown transport type: ${config.transport}`);
  }
}
