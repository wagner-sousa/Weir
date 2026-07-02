import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';
import { clearCacheForTesting } from '../../src/services/status-cache.js';

let app: FastifyInstance;
let tmpDir: string;
let authServer: Server;
let authUrl: string;
let noAuthServer: Server;
let noAuthUrl: string;

describe('POST /api/mcps/test-connection auth detection', () => {
  beforeAll(async () => {
    authServer = createServer((req, res) => {
      let body = '';
      req.on('data', (c: Buffer) => body += c.toString());
      req.on('end', () => {
        if (!body.trim()) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({}));
          return;
        }
        const msg = JSON.parse(body);
        if (msg.method === 'tools/list') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }));
        }
      });
    });
    await new Promise<void>((resolve) => authServer.listen(0, '0.0.0.0', () => resolve()));
    const addr = authServer.address() as { port: number };
    authUrl = `http://0.0.0.0:${addr.port}`;

    noAuthServer = createServer((req, res) => {
      let body = '';
      req.on('data', (c: Buffer) => body += c.toString());
      req.on('end', () => {
        if (!body.trim()) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({}));
          return;
        }
        const msg = JSON.parse(body);
        if (msg.method === 'tools/list') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [] } }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }));
        }
      });
    });
    await new Promise<void>((resolve) => noAuthServer.listen(0, '0.0.0.0', () => resolve()));
    const noAddr = noAuthServer.address() as { port: number };
    noAuthUrl = `http://0.0.0.0:${noAddr.port}`;

    tmpDir = join(tmpdir(), `weir-mcp-routes-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    authServer?.close();
    noAuthServer?.close();
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    clearCacheForTesting();
  });

  it('T070: auth-gated HTTP MCP without token shows needsAuth', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        'auth-mcp': {
          transport: { type: 'http', url: authUrl },
        },
      },
    }, null, 2) + '\n');

    process.env['MCP_CONFIG_PATH'] = configPath;
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as { port: number };

    const res = await fetch(`http://127.0.0.1:${addr.port}/api/mcps/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'auth-mcp',
        transport: { type: 'http', url: authUrl },
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.needsAuth).toBe(true);
    expect(body.success).toBe(false);

    await app.close();
  }, 10000);

  it('T070: non-auth HTTP MCP shows connected regardless of token', async () => {
    const configPath = join(tmpDir, '.mcp.json');
    writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        'noauth-mcp': {
          transport: { type: 'http', url: noAuthUrl },
        },
      },
    }, null, 2) + '\n');

    process.env['MCP_CONFIG_PATH'] = configPath;
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as { port: number };

    const res = await fetch(`http://127.0.0.1:${addr.port}/api/mcps/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'noauth-mcp',
        transport: { type: 'http', url: noAuthUrl },
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.needsAuth).toBeUndefined();
    expect(body.success).toBe(true);

    await app.close();
  }, 10000);
});
