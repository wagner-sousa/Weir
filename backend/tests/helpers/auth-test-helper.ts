import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { vi } from 'vitest';
import { resetStoreForTesting } from '../../src/services/auth-storage.js';

export interface AuthTestContext {
  tmpDir: string;
  configPath: string;
  mcpName: string;
}

export function createAuthTestContext(mcpName = 'TestAuthMcp'): AuthTestContext {
  const tmpDir = join(tmpdir(), `weir-auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
  const configPath = join(tmpDir, '.mcp.json');
  process.env.MCP_CONFIG_PATH = configPath;
  process.env.MCP_AUTH_CONFIG_PATH = join(dirname(configPath), '.mcp-auth.json');
  resetStoreForTesting();

  writeFileSync(
    configPath,
    JSON.stringify({
      mcpServers: {
        [mcpName]: {
          type: 'http',
          url: 'https://mcp.example.com/mcp',
          auth: { clientId: 'test-client-id' },
        },
      },
    }, null, 2) + '\n',
  );

  return { tmpDir, configPath, mcpName };
}

export function cleanupAuthTestContext(ctx: AuthTestContext): void {
  rmSync(ctx.tmpDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
}

export function mockOAuthFlow(fetchMock: ReturnType<typeof vi.fn>): void {
  fetchMock
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        authorization_endpoint: 'https://mcp.example.com/oauth/authorize',
        token_endpoint: 'https://mcp.example.com/oauth/token',
      }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'test-access-token' }),
    } as Response);
}

export function mockOAuthWithTools(fetchMock: ReturnType<typeof vi.fn>, toolCount = 3): void {
  const tools = Array.from({ length: toolCount }, (_, i) => ({
    name: `tool-${i + 1}`,
    description: `Test tool ${i + 1}`,
  }));

  fetchMock
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        authorization_endpoint: 'https://mcp.example.com/oauth/authorize',
        token_endpoint: 'https://mcp.example.com/oauth/token',
      }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'test-access-token' }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        jsonrpc: '2.0',
        id: 1,
        result: { tools },
      }),
    } as Response);
}

export function mockSimpleOAuth2(): void {
  vi.mock('simple-oauth2', () => {
    const mockGetToken = vi.fn(async () => ({
      token: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      },
    }));

    return {
      AuthorizationCode: vi.fn(() => ({
        authorizeURL: vi.fn(() => 'https://mcp.example.com/oauth/authorize?response_type=code&client_id=test-client-id'),
        getToken: mockGetToken,
        createToken: vi.fn(() => ({
          expired: () => false,
          refresh: async () => ({
            token: {
              access_token: 'refreshed-token',
              refresh_token: 'new-refresh-token',
              expires_in: 3600,
            },
          }),
          revoke: async () => undefined,
          token: { access_token: 'test', expires_in: 3600 },
        })),
      })),
    };
  });
}
