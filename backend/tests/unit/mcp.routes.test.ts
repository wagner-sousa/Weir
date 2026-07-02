import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from '../../src/index';
import type { FastifyInstance } from 'fastify';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('GET /api/mcps', () => {
  it('returns 200 with clients array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('clients');
    expect(Array.isArray(body.clients)).toBe(true);
    expect(body).toHaveProperty('timestamp');
  });
});

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('status', 'ok');
  });
});

describe('POST /api/mcps/test-connection needsAuth', () => {
  let tmpDir: string;
  let origConfigPath: string | undefined;

  beforeEach(() => {
    origConfigPath = process.env.MCP_CONFIG_PATH;
    tmpDir = join(tmpdir(), `weir-mcp-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
    writeFileSync(process.env.MCP_CONFIG_PATH!, JSON.stringify({
      mcpServers: {
        'auth-mcp': { type: 'http', url: 'https://example.com/mcp' },
      },
    }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    process.env.MCP_CONFIG_PATH = origConfigPath;
    vi.unstubAllGlobals();
  });

  it('returns needsAuth: true when testConnection detects 401 on tools/list', async () => {
    vi.mocked(fetch)
      // First call: initialize succeeds (200)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
      } as Response)
      // Second call: detectAuthRequired (tools/list) returns 401
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response)
      // Third call: discoverOAuth2 fails (no mock, will be caught)
      .mockRejectedValueOnce(new Error('discovery failed'));

    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps/test-connection',
      payload: {
        name: 'auth-mcp',
        transport: { type: 'http', url: 'https://example.com/mcp' },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.needsAuth).toBe(true);
    expect(body.success).toBe(false);
  });

  it('returns connected for non-auth HTTP MCP regardless of token', async () => {
    vi.mocked(fetch)
      // First call: initialize succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
      } as Response)
      // Second call: detectAuthRequired (tools/list) returns 200 with tools
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: { tools: [{ name: 'tool1' }] } }),
      } as Response)
      // Third call: queryTools returns tools
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'tool1' }] } }),
      } as Response);

    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps/test-connection',
      payload: {
        name: 'auth-mcp',
        transport: { type: 'http', url: 'https://example.com/mcp' },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.needsAuth).toBeUndefined();
    expect(body.success).toBe(true);
  });
});

describe('T011: testSingleMCP error message detail', () => {
  let tmpDir: string;
  let origConfigPath: string | undefined;

  beforeEach(() => {
    origConfigPath = process.env.MCP_CONFIG_PATH;
    tmpDir = join(tmpdir(), `weir-mcp-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
    writeFileSync(process.env.MCP_CONFIG_PATH!, JSON.stringify({ mcpServers: {} }));
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    process.env.MCP_CONFIG_PATH = origConfigPath;
    vi.unstubAllGlobals();
  });

  it('should include connection refused detail in error message', async () => {
    vi.mocked(fetch).mockRejectedValue(
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9121'), { code: 'ECONNREFUSED' }),
      }),
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps',
      payload: {
        name: 'test-http-mcp',
        type: 'http',
        url: 'http://host.docker.internal:19999/mcp',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.testResult.error).toContain('Connection refused');
  });
});
