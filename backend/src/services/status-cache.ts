import type { CachedStatus } from '../config/types.js';

const cache = new Map<string, CachedStatus>();

function getTTL(): number {
  return parseInt(process.env.MCP_CACHE_TTL ?? '60000', 10);
}

export function getCachedStatus(name: string): CachedStatus | undefined {
  const entry = cache.get(name);
  if (!entry) return undefined;
  if (Date.now() - entry.lastTestedAt > getTTL()) {
    cache.delete(name);
    return undefined;
  }
  return entry;
}

export function setCachedStatus(name: string, status: Omit<CachedStatus, 'lastTestedAt'>): void {
  cache.set(name, { ...status, lastTestedAt: Date.now() });
}

export function deleteCachedStatus(name: string): void {
  cache.delete(name);
}

export function getAllCachedStatuses(): Map<string, CachedStatus> {
  const now = Date.now();
  const ttl = getTTL();
  for (const [name, entry] of cache) {
    if (now - entry.lastTestedAt > ttl) {
      cache.delete(name);
    }
  }
  return new Map(cache);
}

export function getCacheTTL(): number {
  return getTTL();
}

/** @internal */
export function clearCacheForTesting(): void {
  cache.clear();
}
