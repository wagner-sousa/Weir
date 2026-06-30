import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let getCachedStatus: typeof import('../../src/services/status-cache.js')['getCachedStatus'];
let setCachedStatus: typeof import('../../src/services/status-cache.js')['setCachedStatus'];
let deleteCachedStatus: typeof import('../../src/services/status-cache.js')['deleteCachedStatus'];
let getAllCachedStatuses: typeof import('../../src/services/status-cache.js')['getAllCachedStatuses'];
let clearCacheForTesting: typeof import('../../src/services/status-cache.js')['clearCacheForTesting'];

describe('StatusCache', () => {
  const mockStatus = {
    status: 'connected' as const,
    error: null,
    toolCount: 5,
    needsAuth: false,
    authUrl: null,
  };

  beforeEach(async () => {
    vi.stubEnv('MCP_CACHE_TTL', '60000');
    const mod = await import('../../src/services/status-cache.js');
    getCachedStatus = mod.getCachedStatus;
    setCachedStatus = mod.setCachedStatus;
    deleteCachedStatus = mod.deleteCachedStatus;
    getAllCachedStatuses = mod.getAllCachedStatuses;
    clearCacheForTesting = mod.clearCacheForTesting;
    clearCacheForTesting();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stores and retrieves a cached status', () => {
    setCachedStatus('test-mcp', mockStatus);
    const result = getCachedStatus('test-mcp');
    expect(result).toBeDefined();
    expect(result!.status).toBe('connected');
    expect(result!.toolCount).toBe(5);
    expect(result!.lastTestedAt).toBeGreaterThan(0);
  });

  it('returns undefined for uncached MCP', () => {
    const result = getCachedStatus('nonexistent');
    expect(result).toBeUndefined();
  });

  it('deletes a cached status', () => {
    setCachedStatus('test-mcp', mockStatus);
    deleteCachedStatus('test-mcp');
    const result = getCachedStatus('test-mcp');
    expect(result).toBeUndefined();
  });

  it('returns undefined when TTL has expired', async () => {
    clearCacheForTesting();

    setCachedStatus('test-mcp', mockStatus);
    await new Promise((r) => setTimeout(r, 5));

    const result = getCachedStatus('test-mcp');
    expect(result).toBeDefined();

    vi.stubEnv('MCP_CACHE_TTL', '1');
    await new Promise((r) => setTimeout(r, 5));

    const result2 = getCachedStatus('test-mcp');
    expect(result2).toBeUndefined();
  });

  it('returns all cached statuses', () => {
    setCachedStatus('mcp1', mockStatus);
    setCachedStatus('mcp2', { ...mockStatus, status: 'error', error: 'timeout' });
    const all = getAllCachedStatuses();
    expect(all.size).toBe(2);
    expect(all.get('mcp1')!.status).toBe('connected');
    expect(all.get('mcp2')!.status).toBe('error');
  });

  it('returns empty map when nothing is cached', () => {
    const all = getAllCachedStatuses();
    expect(all.size).toBe(0);
  });
});
