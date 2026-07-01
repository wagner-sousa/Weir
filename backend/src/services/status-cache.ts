import Conf from 'conf';
import { resolve, dirname } from 'node:path';
import type { CachedStatus } from '../config/types.js';

const cache = new Map<string, CachedStatus>();

interface StatusCacheSchema {
  entries: Record<string, CachedStatus>;
}

function getTTL(): number {
  return parseInt(process.env.MCP_CACHE_TTL ?? '60000', 10);
}

function getCacheDir(): string {
  const mcpPath = process.env.MCP_CONFIG_PATH ?? resolve(process.cwd(), '.mcp.json');
  return dirname(mcpPath);
}

let _store: Conf<StatusCacheSchema> | null = null;

function getStore(): Conf<StatusCacheSchema> {
  if (!_store) {
    _store = new Conf<StatusCacheSchema>({
      cwd: getCacheDir(),
      configName: 'mcp-cache',
      fileExtension: 'json',
      defaults: { entries: {} },
    });
  }
  return _store;
}

function loadFromDisk(): void {
  try {
    const store = getStore();
    const entries = store.get('entries') as Record<string, CachedStatus> | undefined;
    if (!entries) return;
    const now = Date.now();
    const ttl = getTTL();
    for (const [name, entry] of Object.entries(entries)) {
      if (now - entry.lastTestedAt <= ttl) {
        cache.set(name, entry);
      }
    }
  } catch {
    // Disk cache unavailable, start fresh
  }
}

loadFromDisk();

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
  const entry = { ...status, lastTestedAt: Date.now() };
  cache.set(name, entry);
  try {
    const store = getStore();
    store.set(`entries.${name}`, entry);
  } catch {
    // Non-fatal if disk write fails
  }
}

export function deleteCachedStatus(name: string): void {
  cache.delete(name);
  try {
    const store = getStore();
    store.delete(`entries.${name}`);
  } catch {
    // Non-fatal if disk delete fails
  }
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
  _store = null;
}

/** @internal */
export function reloadCacheForTesting(): void {
  cache.clear();
  _store = null;
  loadFromDisk();
}
