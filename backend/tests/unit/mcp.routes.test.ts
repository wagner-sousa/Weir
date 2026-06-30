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
