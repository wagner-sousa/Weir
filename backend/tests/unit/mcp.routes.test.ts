import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from '../../src/index';
import type { FastifyInstance } from 'fastify';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
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

describe('Tool Visibility Endpoints', () => {
  let tmpDir: string;
  let origConfigPath: string | undefined;

  beforeEach(() => {
    origConfigPath = process.env.MCP_CONFIG_PATH;
    tmpDir = join(tmpdir(), `weir-mcp-vis-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
    writeFileSync(process.env.MCP_CONFIG_PATH, JSON.stringify({
      mcpServers: {
        'test-mcp': { type: 'stdio', command: 'echo', args: ['hello'] },
      },
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    process.env.MCP_CONFIG_PATH = origConfigPath;
  });

  describe('GET /api/mcps/:name/tools/visibility', () => {
    it('returns empty visibility when no config exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/mcps/test-mcp/tools/visibility',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.visibility).toEqual({});
      expect(body.totalCount).toBe(0);
      expect(body.enabledCount).toBe(0);
    });

    it('returns visibility config when file exists', async () => {
      const config = { 'test-mcp': { tool1: true, tool2: false } };
      writeFileSync(join(tmpDir, 'tool-visibility.json'), JSON.stringify(config));

      const res = await app.inject({
        method: 'GET',
        url: '/api/mcps/test-mcp/tools/visibility',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.visibility).toEqual({ tool1: true, tool2: false });
    });

    it('returns 404 for non-existent MCP', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/mcps/nonexistent/tools/visibility',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/mcps/:name/tools/visibility/:toolName', () => {
    it('sets tool visibility', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/mcps/test-mcp/tools/visibility/myTool',
        payload: { enabled: false },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      const config = JSON.parse(readFileSync(join(tmpDir, 'tool-visibility.json'), 'utf-8'));
      expect(config['test-mcp'].myTool).toBe(false);
    });

    it('toggles existing tool visibility', async () => {
      const config = { 'test-mcp': { myTool: true } };
      writeFileSync(join(tmpDir, 'tool-visibility.json'), JSON.stringify(config));

      const res = await app.inject({
        method: 'PUT',
        url: '/api/mcps/test-mcp/tools/visibility/myTool',
        payload: { enabled: false },
      });

      expect(res.statusCode).toBe(200);
      const updated = JSON.parse(readFileSync(join(tmpDir, 'tool-visibility.json'), 'utf-8'));
      expect(updated['test-mcp'].myTool).toBe(false);
    });

    it('returns 400 for missing enabled field', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/mcps/test-mcp/tools/visibility/myTool',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/mcps/:name/tools/visibility (bulk)', () => {
    it('sets all tools to disabled', async () => {
      const config = { 'test-mcp': { a: true, b: true } };
      writeFileSync(join(tmpDir, 'tool-visibility.json'), JSON.stringify(config));

      const res = await app.inject({
        method: 'PUT',
        url: '/api/mcps/test-mcp/tools/visibility',
        payload: { enabled: false, tools: ['a', 'b'] },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      const updated = JSON.parse(readFileSync(join(tmpDir, 'tool-visibility.json'), 'utf-8'));
      expect(updated['test-mcp']).toEqual({ a: false, b: false });
    });

    it('sets all tools to enabled', async () => {
      const config = { 'test-mcp': { a: false, b: false } };
      writeFileSync(join(tmpDir, 'tool-visibility.json'), JSON.stringify(config));

      const res = await app.inject({
        method: 'PUT',
        url: '/api/mcps/test-mcp/tools/visibility',
        payload: { enabled: true, tools: ['a', 'b'] },
      });

      expect(res.statusCode).toBe(200);
      const updated = JSON.parse(readFileSync(join(tmpDir, 'tool-visibility.json'), 'utf-8'));
      expect(updated['test-mcp']).toEqual({ a: true, b: true });
    });
  });

  describe('GET /api/mcps/:name/tools (with includeDisabled)', () => {
    it('returns all tools when includeDisabled=true', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/mcps/test-mcp/tools?includeDisabled=true',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveProperty('tools');
      expect(Array.isArray(body.tools)).toBe(true);
    });
  });
});
