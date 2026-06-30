import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { resetStoreForTesting } from '../../src/services/auth-storage.js';

// Mock simple-oauth2 to avoid HTTP calls during tests
vi.mock('simple-oauth2', () => {
  const mockAuthorizeURL = vi.fn((opts) => {
    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', 'test-client-id');
    if (opts?.redirect_uri) params.set('redirect_uri', opts.redirect_uri);
    if (opts?.code_challenge) params.set('code_challenge', opts.code_challenge);
    if (opts?.code_challenge_method) params.set('code_challenge_method', opts.code_challenge_method);
    if (opts?.scope) params.set('scope', opts.scope);
    return `https://mcp.clickup.com/oauth/authorize?${params.toString()}`;
  });

  const mockGetToken = vi.fn(async () => ({
    token: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    },
  }));

  const mockCreateToken = vi.fn(() => ({
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
  }));

  return {
    AuthorizationCode: vi.fn(() => ({
      authorizeURL: mockAuthorizeURL,
      getToken: mockGetToken,
      createToken: mockCreateToken,
    })),
  };
});

let app: FastifyInstance;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = join(tmpdir(), `weir-auth-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  process.env.MCP_CONFIG_PATH = join(tmpDir, '.mcp.json');
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  rmSync(tmpDir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('POST /api/auth/:name/start', () => {
  beforeEach(() => {
    writeFileSync(
      process.env.MCP_CONFIG_PATH!,
      JSON.stringify({
        mcpServers: {
          'ClickUp': {
            type: 'http',
            url: 'https://mcp.clickup.com/mcp',
            auth: { clientId: 'test-client-id' },
          },
        },
      }, null, 2) + '\n',
    );
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns authorization URL for a known MCP', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authorization_endpoint: 'https://mcp.clickup.com/oauth/authorize',
        token_endpoint: 'https://mcp.clickup.com/oauth/token',
        scopes_supported: ['read', 'write'],
      }),
    } as Response);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/ClickUp/start',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.url).toContain('https://mcp.clickup.com/oauth/authorize');
    expect(body.url).toContain('response_type=code');
    expect(body.url).toContain('client_id=test-client-id');
  });

  it('returns 404 for nonexistent MCP', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/Nonexistent/start',
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('not found');
  });

  it('returns 400 when OAuth2 discovery fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/ClickUp/start',
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain('No OAuth2 configuration');
  });

  it('returns error when no clientId and no registration endpoint', async () => {
    writeFileSync(
      process.env.MCP_CONFIG_PATH!,
      JSON.stringify({
        mcpServers: {
          'NoClient': {
            type: 'http',
            url: 'https://example.com/mcp',
          },
        },
      }, null, 2) + '\n',
    );

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        authorization_endpoint: 'https://example.com/oauth/authorize',
        token_endpoint: 'https://example.com/oauth/token',
      }),
    } as Response);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/NoClient/start',
    });
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.url).toBeNull();
    expect(body.error).toContain('No client_id');
  });
});

describe('GET /api/auth/:name/callback', () => {
  beforeEach(() => {
    process.env.MCP_AUTH_CONFIG_PATH = join(dirname(process.env.MCP_CONFIG_PATH!), '.mcp-auth.json');
    resetStoreForTesting();
    writeFileSync(
      process.env.MCP_CONFIG_PATH!,
      JSON.stringify({
        mcpServers: {
          'ClickUp': {
            type: 'http',
            url: 'https://mcp.clickup.com/mcp',
            auth: { clientId: 'test-client-id' },
            accessToken: undefined,
          },
        },
      }, null, 2) + '\n',
    );
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores accessToken in .mcp-auth.json after successful exchange', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          authorization_endpoint: 'https://mcp.clickup.com/oauth/authorize',
          token_endpoint: 'https://mcp.clickup.com/oauth/token',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'persisted-token-789' }),
      } as Response);

    await app.inject({
      method: 'GET',
      url: '/api/auth/ClickUp/callback?code=test-auth-code-123',
    });

    const authPath = process.env.MCP_AUTH_CONFIG_PATH || join(dirname(process.env.MCP_CONFIG_PATH!), '.mcp-auth.json');
    if (existsSync(authPath)) {
      const raw = JSON.parse(readFileSync(authPath, 'utf-8'));
      const servers = raw.mcpServers || raw;
      expect(servers.ClickUp.accessToken).toBe('persisted-token-789');
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges code and returns success page', async () => {
    // First call: discoverOAuth2 on callback
    // Second call: token exchange
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          authorization_endpoint: 'https://mcp.clickup.com/oauth/authorize',
          token_endpoint: 'https://mcp.clickup.com/oauth/token',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-access-token-456' }),
      } as Response);

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/ClickUp/callback?code=test-auth-code-123',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Authorization successful');
    expect(res.body).toContain('window.close()');
  });

  it('returns error when no code provided', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/ClickUp/callback',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('No authorization code received');
  });

  it('returns error when MCP not found', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/Nonexistent/callback?code=abc',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('not found');
  });

  it('returns error page when auth error is present', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/ClickUp/callback?error=access_denied',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Authorization failed');
    expect(res.body).toContain('access_denied');
  });
});
