import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../src/index';
import type { FastifyInstance } from 'fastify';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('Tool visibility persistence', () => {
  let tmpDir: string;
  let origConfigPath: string | undefined;

  beforeEach(() => {
    origConfigPath = process.env.MCP_CONFIG_PATH;
    tmpDir = join(tmpdir(), `weir-mcp-persist-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
    writeFileSync(process.env.MCP_CONFIG_PATH, JSON.stringify({
      mcpServers: {
        'persist-mcp': { type: 'stdio', command: 'echo', args: ['hello'] },
      },
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    process.env.MCP_CONFIG_PATH = origConfigPath;
  });

  it('persists visibility settings to disk', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/persist-mcp/tools/visibility/myTool',
      payload: { enabled: false },
    });
    expect(res.statusCode).toBe(200);

    const raw = readFileSync(join(tmpDir, 'tool-visibility.json'), 'utf-8');
    const config = JSON.parse(raw);
    expect(config['persist-mcp'].myTool).toBe(false);
  });

  it('reads persisted settings back via GET', async () => {
    writeFileSync(join(tmpDir, 'tool-visibility.json'), JSON.stringify({
      'persist-mcp': { toolA: true, toolB: false },
    }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/mcps/persist-mcp/tools/visibility',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.visibility).toEqual({ toolA: true, toolB: false });
  });

  it('bulk toggle persists correctly', async () => {
    writeFileSync(join(tmpDir, 'tool-visibility.json'), JSON.stringify({
      'persist-mcp': { x: true, y: true },
    }));

    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/persist-mcp/tools/visibility',
      payload: { enabled: false, tools: ['x', 'y'] },
    });
    expect(res.statusCode).toBe(200);

    const raw = readFileSync(join(tmpDir, 'tool-visibility.json'), 'utf-8');
    const config = JSON.parse(raw);
    expect(config['persist-mcp']).toEqual({ x: false, y: false });
  });

  it('survives simulated restart (reload from disk)', async () => {
    // Step 1: set tool disabled via API
    await app.inject({
      method: 'PUT',
      url: '/api/mcps/persist-mcp/tools/visibility/survivor',
      payload: { enabled: false },
    });

    // Step 2: read back (simulates restart - new load from disk)
    const res = await app.inject({
      method: 'GET',
      url: '/api/mcps/persist-mcp/tools/visibility',
    });

    const body = JSON.parse(res.body);
    expect(body.visibility.survivor).toBe(false);
  });
});
