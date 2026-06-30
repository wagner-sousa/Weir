import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';
import { setCachedStatus } from '../../src/services/status-cache.js';
import { queryTools, testConnection, discoverOAuth2 } from '../../src/services/mcp-client.js';
import { createAuthTestContext, cleanupAuthTestContext } from '../helpers/auth-test-helper.js';
import type { AuthTestContext } from '../helpers/auth-test-helper.js';

vi.mock('../../src/services/status-cache.js', () => ({
  setCachedStatus: vi.fn(),
  getCachedStatus: vi.fn(),
  deleteCachedStatus: vi.fn(),
}));

vi.mock('../../src/services/mcp-client.js', async () => {
  const actual = await vi.importActual('../../src/services/mcp-client.js');
  return {
    ...actual,
    queryTools: vi.fn(),
    testConnection: vi.fn().mockResolvedValue({ success: false, error: 'mocked' }),
    discoverOAuth2: vi.fn().mockResolvedValue({
      authorizationEndpoint: 'https://mcp.example.com/oauth/authorize',
      tokenEndpoint: 'https://mcp.example.com/oauth/token',
    }),
  };
});

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

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('T006: OAuth callback propagates tool count', () => {
  const MOCK_TOOLS = [
    { name: 'tool-1', description: 'Tool 1' },
    { name: 'tool-2', description: 'Tool 2' },
    { name: 'tool-3', description: 'Tool 3' },
    { name: 'tool-4', description: 'Tool 4' },
    { name: 'tool-5', description: 'Tool 5' },
  ];

  let ctx: AuthTestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryTools).mockResolvedValue(MOCK_TOOLS);
    ctx = createAuthTestContext('PostmanMock');
  });

  afterEach(() => {
    cleanupAuthTestContext(ctx);
  });

  it('should cache toolCount=5 after OAuth callback when queryTools returns 5 tools', async () => {
    await app.inject({
      method: 'GET',
      url: '/api/auth/PostmanMock/callback?code=test-auth-code',
    });

    expect(queryTools).toHaveBeenCalledWith(
      'PostmanMock',
      expect.objectContaining({ type: 'http', url: 'https://mcp.example.com/mcp' }),
    );

    expect(setCachedStatus).toHaveBeenCalledWith(
      'PostmanMock',
      expect.objectContaining({ toolCount: 5 }),
    );
  });
});
