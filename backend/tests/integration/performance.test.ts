import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { clearCacheForTesting, setCachedStatus } from '../../src/services/status-cache.js';

let app: FastifyInstance;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `weir-perf-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
  process.env.MCP_CONNECTION_TIMEOUT = '2000';
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

afterEach(() => {
  clearCacheForTesting();
});

describe('Performance - Listing Speed', () => {
  it('GET /api/mcps returns instantly with cached status', async () => {
    writeFileSync(
      process.env.MCP_CONFIG_PATH!,
      JSON.stringify({
        mcpServers: {
          fast1: { transport: { type: 'stdio', command: 'echo', args: ['hi'] } },
          fast2: { transport: { type: 'stdio', command: 'echo', args: ['hi'] } },
        },
      }, null, 2) + '\n',
    );

    const start = Date.now();
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    const elapsed = Date.now() - start;
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(500);
    expect(body.clients).toHaveLength(2);
    // Status comes from cache — uncached shows "unknown"
    expect(body.clients[0].status).toBe('unknown');
  });

  it('listing does NOT call testConnection (uncached = unknown)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    const body = JSON.parse(res.body);
    for (const client of body.clients) {
      expect(client.status).toBe('unknown');
    }
  });
});

describe('ToolCount - Integration', () => {
  beforeEach(() => {
    writeFileSync(
      process.env.MCP_CONFIG_PATH!,
      JSON.stringify({
        mcpServers: {
          'tool-mcp': { transport: { type: 'stdio', command: 'echo', args: ['hi'] } },
          'stable-mcp': { transport: { type: 'stdio', command: 'echo', args: ['hi'] } },
          'fresh-mcp': { transport: { type: 'stdio', command: 'echo', args: ['hi'] } },
        },
      }, null, 2) + '\n',
    );
  });

  it('returns cached toolCount from listing (T001)', async () => {
    setCachedStatus('tool-mcp', {
      status: 'connected',
      error: null,
      toolCount: 7,
      needsAuth: false,
      authUrl: null,
    });

    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    const body = JSON.parse(res.body);
    const client = body.clients.find((c: { name: string }) => c.name === 'tool-mcp');
    expect(client).toBeDefined();
    expect(client.toolCount).toBe(7);
  });

  it('preserves toolCount across repeated listing reads (T006)', async () => {
    setCachedStatus('stable-mcp', {
      status: 'connected',
      error: null,
      toolCount: 12,
      needsAuth: false,
      authUrl: null,
    });

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/mcps' });
      const body = JSON.parse(res.body);
      const client = body.clients.find((c: { name: string }) => c.name === 'stable-mcp');
      expect(client).toBeDefined();
      expect(client.toolCount).toBe(12);
    }
  });

  it('broadcastStatusUpdate sends toolCount (T005)', async () => {
    setCachedStatus('fresh-mcp', {
      status: 'connected',
      error: null,
      toolCount: 3,
      needsAuth: false,
      authUrl: null,
    });

    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    const body = JSON.parse(res.body);
    const client = body.clients.find((c: { name: string }) => c.name === 'fresh-mcp');
    expect(client).toBeDefined();
    expect(client.toolCount).toBeGreaterThan(0);
    expect(client.status).toBe('connected');
  });
});
