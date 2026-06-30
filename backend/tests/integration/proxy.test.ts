import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

const ENTRY = resolve(process.cwd(), 'src/index.ts');
const FIXTURE_CONFIG = resolve(process.cwd(), 'tests/integration/fixtures/.mcp.test.json');

function startProxy(name: string): ChildProcess {
  return spawn('npx', ['tsx', ENTRY, '--proxy', name], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, MCP_CONFIG_PATH: FIXTURE_CONFIG },
  });
}

describe('proxy forwarding', () => {
  it('T020: stdio→stdio proxy forwards tools/list', async () => {
    const proxy = startProxy('test-mcp');

    const response = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
      proxy.stdout!.once('data', (data: Buffer) => {
        clearTimeout(timeout);
        resolve(data.toString().trim());
      });
      proxy.stderr!.on('data', (d: Buffer) => process.stderr.write(d));
    });

    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n');

    const result = await response;
    const parsed = JSON.parse(result);
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe(1);
    expect(parsed.result?.tools).toBeDefined();
    expect(Array.isArray(parsed.result.tools)).toBe(true);

    proxy.kill();
  }, 15000);

  it('T022: proxy forwards multiple messages', async () => {
    const proxy = startProxy('test-mcp');

    const responses: string[] = [];
    let buf = '';
    proxy.stdout!.on('data', (data: Buffer) => {
      buf += data.toString();
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) responses.push(trimmed);
      }
    });

    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n');
    proxy.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'echo', arguments: {} } }) + '\n');

    await new Promise<void>((resolve) => setTimeout(resolve, 3000));

    expect(responses.length).toBeGreaterThanOrEqual(2);
    expect(responses.length).toBeLessThanOrEqual(3);
    const r1 = JSON.parse(responses[0]);
    expect(r1.id).toBe(1);
    const r2 = JSON.parse(responses[1]);
    expect(r2.id).toBe(2);

    proxy.kill();
  }, 15000);

  it('T026/T027: two concurrent proxies work independently (US3)', async () => {
    const proxy1 = startProxy('test-mcp');
    const proxy2 = startProxy('test-mcp');

    const resp1 = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout p1')), 10000);
      proxy1.stdout!.once('data', (data: Buffer) => {
        clearTimeout(timeout);
        resolve(data.toString().trim());
      });
    });

    const resp2 = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout p2')), 10000);
      proxy2.stdout!.once('data', (data: Buffer) => {
        clearTimeout(timeout);
        resolve(data.toString().trim());
      });
    });

    proxy1.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/list' }) + '\n');
    proxy2.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id: 20, method: 'tools/list' }) + '\n');

    const [r1, r2] = await Promise.all([resp1, resp2]);
    const p1 = JSON.parse(r1);
    const p2 = JSON.parse(r2);

    expect(p1.id).toBe(10);
    expect(p2.id).toBe(20);
    expect(p1.result.tools).toEqual(p2.result.tools);

    proxy1.kill();
    proxy2.kill();
  }, 20000);
});
