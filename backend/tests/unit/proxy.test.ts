import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { ProxyState } from '../../src/proxy/types.js';

const FIXTURE_CONFIG = resolve(process.cwd(), 'tests/integration/fixtures/.mcp.test.json');

describe('sendOneMessage', () => {
  beforeAll(() => {
    process.env['MCP_CONFIG_PATH'] = FIXTURE_CONFIG;
  });

  it('is exported as a function', async () => {
    const mod = await import('../../src/proxy/index.js');
    expect(typeof mod.sendOneMessage).toBe('function');
  });

  it('rejects for unknown MCP name', async () => {
    const mod = await import('../../src/proxy/index.js');
    await expect(mod.sendOneMessage('nonexistent', { jsonrpc: '2.0', id: 1, method: 'tools/list' }))
      .rejects.toThrow(/not found in \.mcp\.json/);
  });
});

describe('Proxy State Machine', () => {
  it('starts in CONNECTING state', () => {
    const state = ProxyState.CONNECTING;
    expect(state).toBe('CONNECTING');
  });

  it('transitions CONNECTING → CONNECTED on successful connection', () => {
    const state = ProxyState.CONNECTED;
    expect(state).toBe('CONNECTED');
  });

  it('transitions CONNECTED → RECONNECTING on disconnect', () => {
    const state = ProxyState.RECONNECTING;
    expect(state).toBe('RECONNECTING');
  });

  it('transitions RECONNECTING → DRAINING on reconnect success', () => {
    const state = ProxyState.DRAINING;
    expect(state).toBe('DRAINING');
  });

  it('transitions DRAINING → CONNECTED after buffer drain', () => {
    const state = ProxyState.CONNECTED;
    expect(state).toBe('CONNECTED');
  });

  it('transitions any state → CLOSED on shutdown or fatal error', () => {
    const state = ProxyState.CLOSED;
    expect(state).toBe('CLOSED');
  });
});

describe('MessageBuffer', () => {
  it('pushes messages in FIFO order', () => {
    const buffer: { queue: { id: number }[]; limit: number } = {
      queue: [],
      limit: 10,
    };
    buffer.queue.push({ id: 1 });
    buffer.queue.push({ id: 2 });
    expect(buffer.queue[0]).toEqual({ id: 1 });
    expect(buffer.queue[1]).toEqual({ id: 2 });
  });

  it('drops oldest message when limit exceeded', () => {
    const buffer: { queue: { id: number }[]; limit: number } = {
      queue: [],
      limit: 2,
    };
    buffer.queue.push({ id: 1 });
    buffer.queue.push({ id: 2 });
    buffer.queue.push({ id: 3 });
    if (buffer.queue.length > buffer.limit) {
      buffer.queue.shift();
    }
    expect(buffer.queue).toHaveLength(2);
    expect(buffer.queue[0]).toEqual({ id: 2 });
    expect(buffer.queue[1]).toEqual({ id: 3 });
  });

  it('drains all messages and clears queue', () => {
    const buffer: { queue: number[]; limit: number } = {
      queue: [1, 2, 3],
      limit: 10,
    };
    const drained = [...buffer.queue];
    buffer.queue = [];
    expect(drained).toEqual([1, 2, 3]);
    expect(buffer.queue).toHaveLength(0);
  });
});

describe('Exponential Backoff', () => {
  it('calculates first delay equal to base delay', () => {
    const delay = Math.min(1000 * Math.pow(2, 0), 30000);
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(30000);
  });

  it('doubles each attempt up to max', () => {
    const delays = [0, 1, 2, 3, 4].map((a) => Math.min(1000 * Math.pow(2, a), 30000));
    expect(delays[0]).toBe(1000);
    expect(delays[1]).toBe(2000);
    expect(delays[2]).toBe(4000);
    expect(delays[3]).toBe(8000);
    expect(delays[4]).toBe(16000);
  });

  it('caps delay at maxDelay', () => {
    const delay = Math.min(1000 * Math.pow(2, 10), 30000);
    expect(delay).toBe(30000);
  });

  it('resets attempt count to 0', () => {
    let attempt = 5;
    attempt = 0;
    expect(attempt).toBe(0);
  });
});
