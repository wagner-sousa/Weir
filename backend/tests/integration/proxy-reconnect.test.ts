import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

const ENTRY = resolve(process.cwd(), 'src/index.ts');
const FIXTURE_CONFIG = resolve(process.cwd(), 'tests/integration/fixtures/.mcp.test-reconnect.json');

function startProxy(extraEnv?: Record<string, string>): ChildProcess {
  return spawn('npx', ['tsx', ENTRY, '--proxy', 'crashable-mcp'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      MCP_CONFIG_PATH: FIXTURE_CONFIG,
      CRASH_AFTER: '1',
      WEIR_PROXY_RECONNECT_BASE_DELAY: '200',
      WEIR_PROXY_RECONNECT_MAX_DELAY: '1000',
      WEIR_PROXY_RECONNECT_MAX_RETRIES: '10',
      WEIR_PROXY_KEEPALIVE_MS: '0',
      ...extraEnv,
    },
  });
}

function collectResponses(proxy: ChildProcess): { responses: string[]; buffer: string } {
  const responses: string[] = [];
  let buffer = '';
  proxy.stdout!.on('data', (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) responses.push(trimmed);
    }
  });
  return { responses, buffer };
}

function waitForResponses(
  proxy: ChildProcess,
  responses: string[],
  currentCount: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for responses (count=${responses.length})`)), timeoutMs);
    const check = (data: Buffer) => {
      if (responses.length > currentCount) {
        clearTimeout(timer);
        proxy.stdout!.off('data', check);
        resolve();
      }
    };
    proxy.stdout!.on('data', check);
  });
}

describe('proxy reconnect after backend crash', () => {
  it('T021: proxy reconnects after backend crash and continues forwarding', async () => {
    const proxy = startProxy();
    const { responses } = collectResponses(proxy);
    proxy.stderr!.on('data', (d: Buffer) => process.stderr.write(d));

    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // Send first message — backend processes it then crashes
    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n');

    // Wait for first response before crash
    await waitForResponses(proxy, responses, 0, 8000);
    expect(responses.length).toBeGreaterThanOrEqual(1);
    const first = JSON.parse(responses[0]);
    expect(first.id).toBe(1);
    expect(first.result?.tools).toBeDefined();

    const beforeCrashCount = responses.length;

    // Wait for proxy to detect disconnect and reconnect (backoff ~200ms + jitter)
    // The new backend instance should be ready within a few seconds
    await new Promise<void>((resolve) => setTimeout(resolve, 4000));

    const afterReconnectCount = responses.length;

    // Send second message — should be handled by the new backend instance
    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');

    // Wait for response
    await waitForResponses(proxy, responses, afterReconnectCount, 8000);
    expect(responses.length).toBeGreaterThan(afterReconnectCount);

    const last = JSON.parse(responses[responses.length - 1]);
    expect(last.id).toBe(2);
    expect(last.result?.tools).toBeDefined();

    // Verify we didn't lose messages: both responses should be present
    const ids = responses.map((r) => JSON.parse(r).id).sort();
    expect(ids).toContain(1);
    expect(ids).toContain(2);

    proxy.kill();
  }, 30000);

  it('T021b: messages sent during disconnect are buffered and resent after reconnect', async () => {
    const proxy = startProxy({ CRASH_AFTER: '3' });
    const { responses } = collectResponses(proxy);
    proxy.stderr!.on('data', (d: Buffer) => process.stderr.write(d));

    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // Send first message — backend processes and crashes
    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n');

    // Wait for first response
    await waitForResponses(proxy, responses, 0, 8000);
    const afterFirst = responses.length;

    // Send two more messages — they go to the new backend instance
    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }) + '\n');

    // Wait for both responses
    await waitForResponses(proxy, responses, afterFirst, 8000);
    expect(responses.length).toBeGreaterThanOrEqual(afterFirst + 1);

    // We should have at least 3 responses
    expect(responses.length).toBeGreaterThanOrEqual(3);

    const ids = responses.map((r) => JSON.parse(r).id).sort((a, b) => a - b);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).toContain(3);

    proxy.kill();
  }, 30000);
});
