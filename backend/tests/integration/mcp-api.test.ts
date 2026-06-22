import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let app: FastifyInstance;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `weir-mcp-api-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  writeFileSync(
    process.env.MCP_CONFIG_PATH!,
    JSON.stringify({
      mcpServers: {
        existing: { transport: { type: 'stdio', command: 'echo', args: ['hi'] } },
      },
    }, null, 2) + '\n',
  );
});

describe('POST /api/mcps/test-connection', () => {
  it('returns success for valid stdio command', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps/test-connection',
      payload: {
        transport: { type: 'stdio', command: 'echo', args: ['hello'] },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('accepts flat format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps/test-connection',
      payload: {
        type: 'stdio',
        command: 'echo',
        args: ['flat'],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('returns error for nonexistent command', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps/test-connection',
      payload: {
        transport: { type: 'stdio', command: 'nonexistent-cmd-xyz' },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it('returns error for invalid transport', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps/test-connection',
      payload: {
        transport: { type: 'invalid' },
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/mcps', () => {
  it('adds new MCP and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps',
      payload: {
        name: 'new-server',
        transport: { type: 'http', url: 'https://example.com/mcp' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.name).toBe('new-server');
  });

  it('accepts flat format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps',
      payload: {
        name: 'flat-server',
        type: 'stdio',
        command: 'cat',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('returns 409 for duplicate name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps',
      payload: {
        name: 'existing',
        transport: { type: 'stdio', command: 'echo' },
      },
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('already exists');
  });

  it('returns 400 for validation error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcps',
      payload: {
        name: 'bad',
        transport: { type: 'stdio' },
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
