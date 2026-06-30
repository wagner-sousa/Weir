import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/index.js';
import { startMcpServer, stopMcpServer } from '../../src/mcp/mcp.server.js';

const FIXTURE_CONFIG = resolve(process.cwd(), 'tests/integration/fixtures/.mcp.test.json');
const OLD_CONFIG = process.env['MCP_CONFIG_PATH'];

let app: FastifyInstance;
let mainUrl: string;
let mcpUrl: string;

async function readSseEvent(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    if (buffer.includes('\n\n')) break;
  }
  return buffer;
}

describe('MCP Port Server Integration', () => {
  beforeAll(async () => {
    process.env['MCP_CONFIG_PATH'] = FIXTURE_CONFIG;

    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as { port: number };
    mainUrl = `http://127.0.0.1:${addr.port}`;

    const mcpServer = await startMcpServer(0);
    const mcpAddr = mcpServer.server.address() as { port: number };
    mcpUrl = `http://127.0.0.1:${mcpAddr.port}`;
  }, 15000);

  afterAll(async () => {
    await stopMcpServer();
    await app.close();
    if (OLD_CONFIG) {
      process.env['MCP_CONFIG_PATH'] = OLD_CONFIG;
    } else {
      delete process.env['MCP_CONFIG_PATH'];
    }
  });

  it('T035: SSE stream connects and can round-trip a message', async () => {
    const response = await fetch(`${mcpUrl}/mcp/test-mcp`);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/event-stream');

    const reader = response.body!.getReader();
    const event = await readSseEvent(reader);

    expect(event).toContain('event: endpoint');
    const match = event.match(/data: (\/mcp\/test-mcp\/message\?sessionId=[a-f0-9]+)/);
    expect(match).not.toBeNull();
    const postUrl = match![1];

    expect(event).toContain('event: status');
    expect(event).toContain('"status":"connected"');

    const postResponse = await fetch(`${mcpUrl}${postUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(postResponse.status).toBe(202);

    const msgEvent = await readSseEvent(reader);
    expect(msgEvent).toContain('event: message');
    expect(msgEvent).toContain('"id":1');
    expect(msgEvent).toContain('"tools"');

    reader.cancel();
  }, 15000);

  it('T036: returns 404 for unknown MCP name on MCP port', async () => {
    const response = await fetch(`${mcpUrl}/mcp/nonexistent`);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });

  it('T036: returns 400 for invalid JSON-RPC POST body', async () => {
    const response = await fetch(`${mcpUrl}/mcp/test-mcp/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: true }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid Request');
  });

  it('T037: main API health endpoint unaffected by MCP port', async () => {
    const response = await fetch(`${mainUrl}/api/health`);
    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
