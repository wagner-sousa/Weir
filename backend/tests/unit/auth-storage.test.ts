import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import {
  getAuthConfig,
  setAuthConfig,
  deleteAuthConfig,
  migrateFromMcpJson,
  getAuthConfigPath,
  resetStoreForTesting,
} from '../../src/services/auth-storage.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `weir-auth-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  process.env.MCP_AUTH_CONFIG_PATH = join(tmpDir, '.mcp-auth.json');
  process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  resetStoreForTesting();
});

describe('AuthStorage', () => {
  it('stores and retrieves auth config', () => {
    setAuthConfig('test-mcp', { accessToken: 'token-123', auth: { clientId: 'client-1' } });
    const result = getAuthConfig('test-mcp');
    expect(result).toBeDefined();
    expect(result!.accessToken).toBe('token-123');
    expect(result!.auth!.clientId).toBe('client-1');
  });

  it('returns undefined for missing entry', () => {
    const result = getAuthConfig('nonexistent');
    expect(result).toBeUndefined();
  });

  it('deletes auth config', () => {
    setAuthConfig('test-mcp', { accessToken: 'token-123' });
    deleteAuthConfig('test-mcp');
    const result = getAuthConfig('test-mcp');
    expect(result).toBeUndefined();
  });

  it('overwrites existing entry', () => {
    setAuthConfig('test-mcp', { accessToken: 'old-token' });
    setAuthConfig('test-mcp', { accessToken: 'new-token' });
    const result = getAuthConfig('test-mcp');
    expect(result!.accessToken).toBe('new-token');
  });

  it('migrates accessToken from .mcp.json', () => {
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify({
      mcpServers: {
        ClickUp: {
          type: 'http',
          url: 'https://mcp.clickup.com/mcp',
          accessToken: 'clickup-token',
          auth: { clientId: 'cu-client' },
        },
      },
    }, null, 2));

    migrateFromMcpJson(join(tmpDir, '.mcp.json'));

    const result = getAuthConfig('ClickUp');
    expect(result).toBeDefined();
    expect(result!.accessToken).toBe('clickup-token');
    expect(result!.auth!.clientId).toBe('cu-client');
  });

  it('does not overwrite existing .mcp-auth.json on migration', () => {
    setAuthConfig('ExistingMCP', { accessToken: 'existing-token' });

    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify({
      mcpServers: {
        ExistingMCP: {
          type: 'http',
          url: 'https://example.com/mcp',
          accessToken: 'old-inline-token',
        },
      },
    }, null, 2));

    migrateFromMcpJson(join(tmpDir, '.mcp.json'));

    const result = getAuthConfig('ExistingMCP');
    expect(result!.accessToken).toBe('existing-token');
  });
});
