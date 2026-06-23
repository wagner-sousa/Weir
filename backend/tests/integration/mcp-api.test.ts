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

describe('GET /api/mcps (extended)', () => {
  it('returns status, error, and toolCount for each client', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.clients).toHaveLength(1);
    const client = body.clients[0];
    expect(client).toHaveProperty('status');
    expect(client).toHaveProperty('error');
    expect(client).toHaveProperty('toolCount');
  });

  it('returns disconnected status for unreachable MCPs', async () => {
    writeFileSync(
      process.env.MCP_CONFIG_PATH!,
      JSON.stringify({
        mcpServers: {
          unreachable: { transport: { type: 'http', url: 'http://localhost:1' } },
        },
      }, null, 2) + '\n',
    );
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.clients).toHaveLength(1);
    expect(body.clients[0].status).toBe('error');
    expect(body.clients[0].error).toBeDefined();
  });
});

describe('GET /api/mcps/:name/tools', () => {
  it('returns empty tools array for unreachable MCP', async () => {
    writeFileSync(
      process.env.MCP_CONFIG_PATH!,
      JSON.stringify({
        mcpServers: {
          unreachable: { transport: { type: 'http', url: 'http://localhost:1' } },
        },
      }, null, 2) + '\n',
    );
    const res = await app.inject({ method: 'GET', url: '/api/mcps/unreachable/tools' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body).toHaveProperty('count');
  });

  it('returns 404 for nonexistent MCP', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcps/nonexistent/tools' });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/mcps/:name', () => {
  it('deletes existing MCP and returns 200', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/mcps/existing' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
  });

  it('removes the entry from the config file', async () => {
    await app.inject({ method: 'DELETE', url: '/api/mcps/existing' });
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    const body = JSON.parse(res.body);
    expect(body.clients.find((c: { name: string }) => c.name === 'existing')).toBeUndefined();
  });

  it('returns 404 for nonexistent MCP', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/mcps/nonexistent' });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});

describe('PUT /api/mcps/:name', () => {
  it('updates an existing MCP and returns 200', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/existing',
      payload: {
        name: 'existing',
        transport: { type: 'http', url: 'https://updated.com/mcp' },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.name).toBe('existing');
  });

  it('renames an MCP and returns 200 with new name', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/existing',
      payload: {
        name: 'renamed',
        transport: { type: 'stdio', command: 'echo' },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.name).toBe('renamed');
  });

  it('returns 404 for nonexistent MCP', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/nonexistent',
      payload: {
        name: 'nonexistent',
        transport: { type: 'stdio', command: 'echo' },
      },
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('not found');
  });

  it('returns 409 for duplicate name', async () => {
    // Add a second server first
    await app.inject({
      method: 'POST',
      url: '/api/mcps',
      payload: {
        name: 'other',
        transport: { type: 'http', url: 'https://other.com' },
      },
    });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/existing',
      payload: {
        name: 'other',
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
      method: 'PUT',
      url: '/api/mcps/existing',
      payload: {
        name: 'existing',
        transport: { type: 'stdio' },
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
