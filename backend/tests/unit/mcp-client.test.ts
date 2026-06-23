import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  testConnection,
  queryTools,
  discoverOAuth2,
} from '../../src/services/mcp-client.js';
import type { TransportConfig, TransportConfigWithToken } from '../../src/services/mcp-client.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `weir-mcp-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('testConnection', () => {
  it('returns success for stdio with valid command', async () => {
    const transport: TransportConfig = { type: 'stdio', command: 'echo', args: ['hello'] };
    const result = await testConnection(transport);
    expect(result.success).toBe(true);
  });

  it('passes env vars to child process', async () => {
    const transport: TransportConfig = {
      type: 'stdio',
      command: 'sh',
      args: ['-c', 'echo $MY_VAR'],
      env: { MY_VAR: 'test-value' },
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(true);
  });

  it('returns error for nonexistent command', async () => {
    const transport: TransportConfig = {
      type: 'stdio',
      command: 'nonexistent-command-xyz',
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for http connection refused', async () => {
    const transport: TransportConfig = {
      type: 'http',
      url: 'http://localhost:1',
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for sse connection refused', async () => {
    const transport: TransportConfig = {
      type: 'sse',
      url: 'http://localhost:1/sse',
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('discoverOAuth2', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns auth config on successful well-known discovery', async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          authorization_endpoint: 'https://example.com/oauth/authorize',
          token_endpoint: 'https://example.com/oauth/token',
          registration_endpoint: 'https://example.com/oauth/register',
          scopes_supported: ['read', 'write'],
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await discoverOAuth2('https://example.com/mcp');
    expect(result).toBeDefined();
    expect(result!.authorizationEndpoint).toBe('https://example.com/oauth/authorize');
    expect(result!.tokenEndpoint).toBe('https://example.com/oauth/token');
    expect(result!.registrationEndpoint).toBe('https://example.com/oauth/register');
    expect(result!.scopesSupported).toEqual(['read', 'write']);
  });

  it('returns undefined when well-known endpoint is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    const result = await discoverOAuth2('https://example.com/mcp');
    expect(result).toBeUndefined();
  });

  it('returns undefined when well-known returns non-ok status', async () => {
    const mockResponse = { ok: false, status: 404 };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);
    const result = await discoverOAuth2('https://example.com/mcp');
    expect(result).toBeUndefined();
  });

  it('returns undefined when well-known response is invalid JSON', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ foo: 'bar' }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);
    const result = await discoverOAuth2('https://example.com/mcp');
    expect(result).toBeUndefined();
  });

  it('returns undefined when well-known lacks required fields', async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          authorization_endpoint: 'https://example.com/oauth/authorize',
        }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);
    const result = await discoverOAuth2('https://example.com/mcp');
    expect(result).toBeUndefined();
  });
});

describe('testConnection with Bearer token', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends Authorization Bearer header when accessToken is provided for http', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const transport: TransportConfigWithToken = {
      type: 'http',
      url: 'https://example.com/mcp',
      accessToken: 'test-token-123',
    };
    const result = await testConnection(transport);

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalled();
    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-123');
  });

  it('sends Authorization Bearer header when accessToken is provided for sse', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const transport: TransportConfigWithToken = {
      type: 'sse',
      url: 'https://example.com/sse',
      accessToken: 'test-token-456',
    };
    const result = await testConnection(transport);

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalled();
    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-456');
  });

  it('does not send Authorization header when no accessToken is provided', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result: {} }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const transport: TransportConfigWithToken = {
      type: 'http',
      url: 'https://example.com/mcp',
    };
    const result = await testConnection(transport);

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalled();
    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = (callArgs[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('returns needsAuth=true on 401 response', async () => {
    const mock401 = { ok: false, status: 401 };
    vi.mocked(fetch)
      .mockResolvedValueOnce(mock401 as Response) // first call: testHttpConnection gets 401
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            authorization_endpoint: 'https://example.com/oauth/authorize',
            token_endpoint: 'https://example.com/oauth/token',
          }),
      } as Response); // second call: discoverOAuth2 succeeds

    const transport: TransportConfigWithToken = {
      type: 'http',
      url: 'https://example.com/mcp',
    };
    const result = await testConnection(transport);

    expect(result.success).toBe(false);
    expect(result.needsAuth).toBe(true);
    expect(result.authUrl).toBe('https://example.com/oauth/authorize');
  });
});

describe('queryTools', () => {
  it('returns empty array when MCP server is not reachable', async () => {
    const transport: TransportConfig = {
      type: 'stdio',
      command: 'echo',
      args: ['not-a-mcp'],
    };
    const result = await queryTools('test-server', transport);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
