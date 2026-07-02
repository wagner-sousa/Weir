import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resetStoreForTesting, getAuthConfig, setAuthConfig } from '../../src/services/auth-storage.js';

const tmpDir = join(tmpdir(), `weir-auth-storage-int-${Date.now()}`);

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });
  process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
  process.env.MCP_AUTH_CONFIG_PATH = join(tmpDir, '.mcp-auth.json');
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  resetStoreForTesting();
});

async function migrateAndGetApp(fixture: Record<string, unknown>): Promise<FastifyInstance> {
  writeFileSync(
    join(tmpDir, '.mcp.json'),
    JSON.stringify(fixture, null, 2) + '\n',
  );
  const app = await buildApp();
  return app;
}

describe('migration from .mcp.json on startup', () => {
  it('migrates accessToken from .mcp.json to .mcp-auth.json', async () => {
    const app = await migrateAndGetApp({
      mcpServers: {
        ClickUp: {
          type: 'http',
          url: 'https://mcp.clickup.com/mcp',
          accessToken: 'clickup-token',
          auth: { clientId: 'cu-client' },
        },
      },
    });

    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    expect(res.statusCode).toBe(200);

    const authData = getAuthConfig('ClickUp');
    expect(authData).toBeDefined();
    expect(authData!.accessToken).toBe('clickup-token');
    expect(authData!.auth!.clientId).toBe('cu-client');

    await app.close();
  });

  it('strips OAuth fields from .mcp.json after migration', async () => {
    const app = await migrateAndGetApp({
      mcpServers: {
        Serena: {
          type: 'http',
          url: 'https://serena.local/mcp',
          accessToken: 'serena-token',
          auth: { clientId: 'serena-client', clientSecret: 'serena-secret' },
          pendingCodeVerifier: 'verifier-123',
        },
      },
    });

    const raw = JSON.parse(readFileSync(join(tmpDir, '.mcp.json'), 'utf-8'));
    const entry = raw.mcpServers.Serena;
    expect(entry.accessToken).toBeUndefined();
    expect(entry.auth).toBeUndefined();
    expect(entry.pendingCodeVerifier).toBeUndefined();
    expect(entry.url).toBe('https://serena.local/mcp');
    expect(entry.type).toBe('http');

    await app.close();
  });

  it('does not overwrite existing .mcp-auth.json on migration', async () => {
    setAuthConfig('ExistingMCP', { accessToken: 'existing-token' });

    const app = await migrateAndGetApp({
      mcpServers: {
        ExistingMCP: {
          type: 'http',
          url: 'https://existing.local/mcp',
          accessToken: 'old-inline-token',
        },
      },
    });

    const authData = getAuthConfig('ExistingMCP');
    expect(authData).toBeDefined();
    expect(authData!.accessToken).toBe('existing-token');

    await app.close();
  });

  it('creates mcp-auth.json with 0600 permissions', async () => {
    const app = await migrateAndGetApp({
      mcpServers: {
        TestMCP: {
          type: 'http',
          url: 'https://test.local/mcp',
          accessToken: 'test-token',
        },
      },
    });

    const authPath = join(tmpDir, 'mcp-auth.json');
    if (existsSync(authPath)) {
      const stat = await import('node:fs').then(fs => fs.promises.stat(authPath));
      const mode = stat.mode & 0o777;
      expect(mode).toBe(0o600);
    }

    await app.close();
  });
});
