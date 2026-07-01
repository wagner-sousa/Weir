import { spawn } from 'node:child_process';
import type { TransportConfig } from '../config/types.js';

export type TransportConfigWithToken = TransportConfig & { accessToken?: string };

export interface ConnectionResult {
  success: boolean;
  error?: string;
  needsAuth?: boolean;
  authUrl?: string;
  authConfig?: {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    registrationEndpoint?: string;
    scopesSupported?: string[];
  };
}

export interface ToolResult {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

function parseFetchError(err: unknown, url: string): string {
  if (err instanceof TypeError && err.message === 'fetch failed') {
    const cause = err.cause as { code?: string; message?: string } | undefined;
    if (cause?.code === 'ENOTFOUND') {
      return `Server unreachable: DNS resolution failed for ${url}`;
    }
    if (cause?.code === 'ECONNREFUSED') {
      return `Server unreachable: Connection refused at ${url}`;
    }
    if (cause?.message?.includes('getaddrinfo ENOTFOUND')) {
      const host = cause.message.split(' ').pop() || 'unknown';
      return `Server unreachable: DNS resolution failed for ${host}`;
    }
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return `Server unreachable: Connection timed out at ${url}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
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
      resolve({ success: false, error: 'Connection timeout exceeded' });
    }, parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10));

    let output = '';

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
      // Check for valid JSON-RPC response (initialize or tools/list)
      try {
        const parsed = JSON.parse(output);
        if (parsed.jsonrpc === '2.0' && (parsed.result || parsed.error)) {
          clearTimeout(timeout);
          child.kill();
          if (parsed.error) {
            resolve({ success: false, error: parsed.error.message || 'MCP error' });
          } else {
            resolve({ success: true });
          }
        }
      } catch {
        // not complete JSON yet, keep buffering
      }
    });

    child.stderr?.on('data', () => {
      // ignore stderr
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `Process exited with code ${code}` });
      }
    });

    // Send MCP initialize request
    try {
      const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'weir', version: '0.1.0' },
        },
      });
      if (child.stdin) {
        child.stdin.on('error', () => {});
        child.stdin.write(request + '\n');
      }
    } catch {
      // stdin may already be closed
    }
  });
}

async function testHttpConnection(transport: TransportConfigWithToken): Promise<ConnectionResult> {
  const url = replaceLocalhost(transport.url!);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10),
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (transport.accessToken) {
      headers['Authorization'] = `Bearer ${transport.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'weir', version: '0.1.0' },
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 401) {
      const authConfig = await discoverOAuth2(url);
      return {
        success: false,
        error: `HTTP 401`,
        needsAuth: true,
        authUrl: authConfig?.authorizationEndpoint,
        authConfig,
      };
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    // Try to parse the response as JSON-RPC
    try {
      const data = await response.json();
      if (data.jsonrpc === '2.0' && data.result) {
        return { success: true };
      }
      if (data.error) {
        return { success: false, error: data.error.message || 'MCP error' };
      }
      return { success: true };
    } catch {
      // Response is valid HTTP but not JSON-RPC — still treat as connected
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: parseFetchError(err, url) };
  }
}

export async function discoverOAuth2(mcpUrl: string): Promise<ConnectionResult['authConfig']> {
  try {
    const baseUrl = new URL(mcpUrl);
    const wellKnownUrl = `${baseUrl.origin}/.well-known/oauth-authorization-server`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(wellKnownUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return undefined;

    const data = await response.json();
    if (data.authorization_endpoint && data.token_endpoint) {
      return {
        authorizationEndpoint: data.authorization_endpoint,
        tokenEndpoint: data.token_endpoint,
        registrationEndpoint: data.registration_endpoint,
        scopesSupported: data.scopes_supported,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function testSseConnection(transport: TransportConfigWithToken): Promise<ConnectionResult> {
  const url = replaceLocalhost(transport.url!);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10),
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (transport.accessToken) {
      headers['Authorization'] = `Bearer ${transport.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'weir', version: '0.1.0' },
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `SSE endpoint returned ${response.status}` };
    }

    try {
      const data = await response.json();
      if (data.jsonrpc === '2.0' && data.result) {
        return { success: true };
      }
      return { success: true };
    } catch {
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: parseFetchError(err, url) };
  }
}

export async function testConnection(transport: TransportConfigWithToken): Promise<ConnectionResult> {
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
  transport: TransportConfigWithToken,
): Promise<ToolResult[]> {
  if (transport.type === 'stdio') {
    return queryStdioTools(transport);
  }

  const url = replaceLocalhost(transport.url!);
  try {
    const controller = new AbortController();
    let timeout = setTimeout(
      () => controller.abort(),
      parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10),
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream, application/json',
    };
    if (transport.accessToken) {
      headers['Authorization'] = `Bearer ${transport.accessToken}`;
    }

    // Step 1: Establish session via initialize (needed for MCPs that require sessions,
    // e.g. Postman and Serena which return mcp-session-id header)
    let sessionId: string | null = null;
    try {
      const initResponse = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'weir', version: '0.1.0' },
          },
        }),
        signal: controller.signal,
      });
      if (initResponse.ok) {
        sessionId = initResponse.headers.get('mcp-session-id') || null;
      }
      await initResponse.text().catch(() => {});
    } catch {
      // initialize failed, continue without session
    }

    // Reset timeout for tools/list request
    clearTimeout(timeout);
    timeout = setTimeout(
      () => controller.abort(),
      parseInt(process.env.MCP_CONNECTION_TIMEOUT ?? '5000', 10),
    );

    // Step 2: Send tools/list with session ID if available
    const headers2: Record<string, string> = { ...headers };
    if (sessionId) {
      headers2['MCP-Session-ID'] = sessionId;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: headers2,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.log(`[queryTools] ${name}: HTTP ${response.status}, body=${body.slice(0, 200)}`);
      return [];
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    // Parse SSE response (text/event-stream)
    if (contentType.includes('text/event-stream')) {
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            const tools = parsed.result?.tools || parsed?.result?.tools;
    if (tools) {
      const toolsArr = tools as Array<{ name: string; description?: string; inputSchema?: unknown }>;
      return toolsArr.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
    }
          } catch {
            // skip malformed SSE data
          }
        }
      }
    return [];
    }

    // Parse JSON response
    try {
      const data = JSON.parse(text);
      if (data.result?.tools) {
        const toolsArr = data.result.tools as Array<{ name: string; description?: string; inputSchema?: unknown }>;
        return toolsArr.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }));
      }
    } catch {
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


