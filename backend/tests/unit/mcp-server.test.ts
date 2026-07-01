import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';

const FIXTURE_CONFIG = resolve(process.cwd(), 'tests/integration/fixtures/.mcp.test.json');
const OLD_CONFIG = process.env['MCP_CONFIG_PATH'];

describe('createProxySession', () => {
  beforeAll(() => {
    process.env['MCP_CONFIG_PATH'] = FIXTURE_CONFIG;
  });

  afterAll(() => {
    if (OLD_CONFIG) {
      process.env['MCP_CONFIG_PATH'] = OLD_CONFIG;
    } else {
      delete process.env['MCP_CONFIG_PATH'];
    }
  });

  it('is exported as a function', async () => {
    const mod = await import('../../src/proxy/index.js');
    expect(typeof mod.createProxySession).toBe('function');
  });

  it('creates a session for a known MCP name', async () => {
    const mod = await import('../../src/proxy/index.js');
    const session = mod.createProxySession('test-mcp');
    expect(session).toBeDefined();
    expect(typeof session.connect).toBe('function');
    expect(typeof session.disconnect).toBe('function');
    expect(typeof session.send).toBe('function');
    expect(typeof session.onMessage).toBe('function');
    expect(typeof session.onDisconnect).toBe('function');
    expect(typeof session.onError).toBe('function');
    expect(typeof session.getState).toBe('function');
  });

  it('throws for unknown MCP name', async () => {
    const mod = await import('../../src/proxy/index.js');
    expect(() => mod.createProxySession('nonexistent')).toThrow(/not found in \.mcp\.json/);
  });

  it('session connects and disconnects', async () => {
    const mod = await import('../../src/proxy/index.js');
    const session = mod.createProxySession('test-mcp');
    expect(session.getState()).toBe('CONNECTING');
    await session.connect();
    expect(session.getState()).toBe('CONNECTED');
    session.disconnect();
    expect(session.getState()).toBe('CLOSED');
  });

  it('forwards messages through the session', async () => {
    const mod = await import('../../src/proxy/index.js');
    const session = mod.createProxySession('test-mcp');

    const response = new Promise<Record<string, unknown>>((resolve) => {
      session.onMessage((msg) => resolve(msg));
    });

    await session.connect();
    await session.send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

    const result = await response;
    expect(result.jsonrpc).toBe('2.0');
    expect(result.id).toBe(1);
    expect(result.result?.tools).toBeDefined();
    session.disconnect();
  });
});
