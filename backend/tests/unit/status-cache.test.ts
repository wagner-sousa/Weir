import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';

let getCachedStatus: typeof import('../../src/services/status-cache.js')['getCachedStatus'];
let setCachedStatus: typeof import('../../src/services/status-cache.js')['setCachedStatus'];
let deleteCachedStatus: typeof import('../../src/services/status-cache.js')['deleteCachedStatus'];
let getAllCachedStatuses: typeof import('../../src/services/status-cache.js')['getAllCachedStatuses'];
let clearCacheForTesting: typeof import('../../src/services/status-cache.js')['clearCacheForTesting'];
let reloadCacheForTesting: typeof import('../../src/services/status-cache.js')['reloadCacheForTesting'];

let tmpDir: string;

describe('StatusCache', () => {
  const mockStatus = {
    status: 'connected' as const,
    error: null,
    toolCount: 5,
    needsAuth: false,
    authUrl: null,
  };

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `weir-cache-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    vi.stubEnv('MCP_CONFIG_PATH', join(tmpDir, '.mcp.json'));
    vi.stubEnv('MCP_CACHE_TTL', '60000');
    const mod = await import('../../src/services/status-cache.js');
    getCachedStatus = mod.getCachedStatus;
    setCachedStatus = mod.setCachedStatus;
    deleteCachedStatus = mod.deleteCachedStatus;
    getAllCachedStatuses = mod.getAllCachedStatuses;
    clearCacheForTesting = mod.clearCacheForTesting;
    reloadCacheForTesting = mod.reloadCacheForTesting;
    clearCacheForTesting();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
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

  it('persists to disk and survives reload', () => {
    setCachedStatus('persist-mcp', mockStatus);

    clearCacheForTesting();
    reloadCacheForTesting();

    const result = getCachedStatus('persist-mcp');
    expect(result).toBeDefined();
    expect(result!.toolCount).toBe(5);
  });

  it('does not load expired entries from disk', () => {
    setCachedStatus('expired-mcp', mockStatus);

    clearCacheForTesting();
    vi.stubEnv('MCP_CACHE_TTL', '0');
    reloadCacheForTesting();

    const result = getCachedStatus('expired-mcp');
    expect(result).toBeUndefined();
  });

  it('delete removes from disk too', () => {
    setCachedStatus('delete-me', mockStatus);

    deleteCachedStatus('delete-me');

    clearCacheForTesting();
    reloadCacheForTesting();

    const result = getCachedStatus('delete-me');
    expect(result).toBeUndefined();
  });
});
