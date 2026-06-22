import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = resolve(import.meta.dirname, '../../..');
const CONTAINER_NAME = 'weir-test-' + Date.now();
const HOST_PORT = 3002;

let tmpDir: string;
let containerRunning = false;

function run(cmd: string, opts = {}): string {
  return execSync(cmd, { encoding: 'utf-8', ...opts });
}

async function waitForServer(url: string, retries = 20): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* server not ready */
    }
    await sleep(500);
  }
  throw new Error(`Server at ${url} did not become ready`);
}

describe('Docker startup', () => {
  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'weir-test-'));
    const mcpConfig = JSON.stringify({
      mcpServers: {
        test: {
          transport: { type: 'stdio', command: 'echo', args: ['hello'] },
        },
      },
    });
    writeFileSync(join(tmpDir, '.mcp.json'), mcpConfig);

    run(`docker build -t weir "${ROOT}"`, { cwd: ROOT });

    run(
      `docker run -d --name ${CONTAINER_NAME} ` +
        `-v ${tmpDir}/.mcp.json:/app/.mcp.json ` +
        `-p ${HOST_PORT}:3000 ` +
        `weir`,
    );
    containerRunning = true;

    await waitForServer(`http://localhost:${HOST_PORT}/api/health`);
  }, 120_000);

  afterAll(() => {
    if (containerRunning) {
      try {
        run(`docker rm -f ${CONTAINER_NAME}`);
      } catch {
        /* ignore */
      }
    }
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }, 15_000);

  it('GET /api/health returns 200', async () => {
    const res = await fetch(`http://localhost:${HOST_PORT}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('GET /api/mcps returns configured MCPs', async () => {
    const res = await fetch(`http://localhost:${HOST_PORT}/api/mcps`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('mcps');
    expect(body.mcps).toHaveLength(1);
    expect(body.mcps[0].name).toBe('test');
  });

  it('GET /api/mcps returns empty list when no .mcp.json', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'weir-empty-'));
    const emptyName = `${CONTAINER_NAME}-empty`;

    try {
      run(
        `docker run -d --name ${emptyName} ` +
          `-v ${emptyDir}:/app/.mcp.json ` +
          `-p ${HOST_PORT + 1}:3000 ` +
          `weir`,
      );

      await waitForServer(`http://localhost:${HOST_PORT + 1}/api/health`);

      const res = await fetch(`http://localhost:${HOST_PORT + 1}/api/mcps`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.mcps).toEqual([]);
    } finally {
      try {
        run(`docker rm -f ${emptyName}`);
      } catch {
        /* ignore */
      }
      try {
        rmSync(emptyDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }, 30_000);
});
