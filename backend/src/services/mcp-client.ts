import { spawn } from 'node:child_process';
import type { TransportConfig } from '../config/types.js';

export interface ConnectionResult {
  success: boolean;
  error?: string;
}

export interface ToolResult {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

function replaceLocalhost(url: string): string {
  return url.replace(/localhost/g, 'host.docker.internal').replace(/127\.0\.0\.1/g, 'host.docker.internal');
}

async function testStdioConnection(transport: TransportConfig): Promise<ConnectionResult> {
  return new Promise((resolve) => {
    const child = spawn(transport.command!, transport.args ?? [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: transport.env ? { ...process.env, ...transport.env } : process.env,
    });

    const timeout = setTimeout(() => {
      child.kill();
      resolve({ success: false, error: 'Connection timed out' });
    }, parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10));

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      resolve({ success: code === 0, error: code !== 0 ? `Process exited with code ${code}` : undefined });
    });
  });
}

async function testHttpConnection(transport: TransportConfig): Promise<ConnectionResult> {
  const url = replaceLocalhost(transport.url!);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10),
    );

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function testSseConnection(transport: TransportConfig): Promise<ConnectionResult> {
  const url = replaceLocalhost(transport.url!);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10),
    );

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { success: response.ok, error: response.ok ? undefined : `SSE endpoint returned ${response.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testConnection(transport: TransportConfig): Promise<ConnectionResult> {
  switch (transport.type) {
    case 'stdio':
      return testStdioConnection(transport);
    case 'http':
      return testHttpConnection(transport);
    case 'sse':
      return testSseConnection(transport);
    default:
      return { success: false, error: `Unknown transport type: ${transport.type}` };
  }
}

export async function queryTools(
  name: string,
  transport: TransportConfig,
): Promise<ToolResult[]> {
  if (transport.type === 'stdio') {
    return queryStdioTools(transport);
  }

  const url = replaceLocalhost(transport.url!);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10),
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (data.result?.tools) {
      return data.result.tools.map((t: { name: string; description?: string; inputSchema?: unknown }) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function queryStdioTools(transport: TransportConfig): Promise<ToolResult[]> {
  return new Promise((resolve) => {
    const child = spawn(transport.command!, transport.args ?? [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: transport.env ? { ...process.env, ...transport.env } : process.env,
    });

    const timeout = setTimeout(() => {
      child.kill();
      resolve([]);
    }, parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10));

    let output = '';

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
      try {
        const parsed = JSON.parse(output);
        if (parsed.result?.tools) {
          clearTimeout(timeout);
          child.kill();
          resolve(
            parsed.result.tools.map(
              (t: { name: string; description?: string; inputSchema?: unknown }) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
              }),
            ),
          );
        }
      } catch {
        // not complete JSON yet, keep buffering
      }
    });

    child.stderr?.on('data', () => {
      // ignore stderr
    });

    child.on('error', () => {
      clearTimeout(timeout);
      resolve([]);
    });

    child.on('exit', () => {
      clearTimeout(timeout);
      resolve([]);
    });

    try {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      });
      if (child.stdin) {
        child.stdin.on('error', () => {});
        child.stdin.write(request + '\n');
        child.stdin.end();
      }
    } catch {
      // stdin may already be closed (e.g., echo command)
    }
  });
}
