import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';

const FIXTURE_CONFIG = resolve(process.cwd(), 'tests/integration/fixtures/.mcp.test.json');

let app: Awaited<ReturnType<typeof import('../../src/index.js').buildApp>>;

beforeAll(async () => {
  process.env['MCP_CONFIG_PATH'] = FIXTURE_CONFIG;
  const { buildApp } = await import('../../src/index.js');
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('HTTP proxy endpoint', () => {
  it('T032: POST /api/proxy/test-mcp forwards tools/list and returns response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/proxy/test-mcp',
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    expect(body.result?.tools).toBeDefined();
    expect(Array.isArray(body.result.tools)).toBe(true);
  });

  it('T032: POST /api/proxy/test-mcp forwards tools/call and returns result', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/proxy/test-mcp',
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'echo', arguments: {} },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(2);
  });

  it('T033: POST /api/proxy/nonexistent returns 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/proxy/nonexistent',
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error?.code).toBe(-32000);
    expect(body.error?.message).toContain('not found');
  });

  it('T033: POST with invalid JSON-RPC body returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/proxy/test-mcp',
      payload: { invalid: true },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error?.code).toBe(-32600);
  });

  it('T033: GET /api/proxy/test-mcp returns 405', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/proxy/test-mcp',
    });

    expect(res.statusCode).toBe(405);
    const body = JSON.parse(res.body);
    expect(body.error?.message).toContain('Method Not Allowed');
  });

  it('T033: PUT /api/proxy/test-mcp returns 405', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/proxy/test-mcp',
    });

    expect(res.statusCode).toBe(405);
  });
}, 30000);
