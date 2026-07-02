import Conf from 'conf';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { stripOAuthFields } from '../config/writer.js';

interface AuthData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  auth?: {
    clientId?: string;
    clientSecret?: string;
  };
  pendingCodeVerifier?: string;
}

interface AuthStorageSchema {
  mcpServers: Record<string, AuthData>;
}

function getConfigPath(): string {
  const mcpPath = process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');
  return process.env.MCP_AUTH_CONFIG_PATH || resolve(dirname(mcpPath), '.mcp-auth.json');
}

let _store: Conf<AuthStorageSchema> | null = null;

function getStore(): Conf<AuthStorageSchema> | null {
  if (!_store) {
    try {
      const dir = dirname(getConfigPath());
      _store = new Conf<AuthStorageSchema>({
        cwd: dir,
        configName: 'mcp-auth',
        fileExtension: 'json',
        defaults: { mcpServers: {} },
        accessPropertiesByDotNotation: false,
        configFileMode: 0o600,
      });
    } catch (err) {
      console.warn(`[auth-storage] Failed to load .mcp-auth.json: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
  return _store;
}

export function getAuthConfig(name: string): AuthData | undefined {
  const store = getStore();
  if (!store) return undefined;
  return store.get(`mcpServers.${name}`);
}

export function setAuthConfig(name: string, data: AuthData): void {
  const store = getStore();
  if (!store) return;
  const existing = store.get(`mcpServers.${name}`) as AuthData | undefined;
  store.set(`mcpServers.${name}`, { ...existing, ...data });
}

export function deleteAuthConfig(name: string): void {
  const store = getStore();
  if (!store) return;
  store.delete(`mcpServers.${name}`);
}

export function getAllAuthNames(): string[] {
  const store = getStore();
  if (!store) return [];
  const servers = store.get('mcpServers') as Record<string, AuthData> | undefined;
  return servers ? Object.keys(servers) : [];
}

/**
 * Migrate OAuth fields from .mcp.json inline entries to .mcp-auth.json.
 * Strips migrated fields from .mcp.json after copying.
 * Idempotent: skips entries already present in .mcp-auth.json.
 */
export function migrateFromMcpJson(mcpJsonPath: string): void {
  if (!existsSync(mcpJsonPath)) return;

  const raw = JSON.parse(readFileSync(mcpJsonPath, 'utf-8'));
  const servers = raw.mcpServers as Record<string, Record<string, unknown>> | undefined;
  if (!servers) return;

  const store = getStore();
  if (!store) return;
  let changed = false;

  for (const [name, entry] of Object.entries(servers)) {
    const hasAccessToken = 'accessToken' in entry || (entry.auth && typeof entry.auth === 'object');
    if (!hasAccessToken) continue;

    // Skip if already migrated
    const existing = store.get(`mcpServers.${name}`) as AuthData | undefined;
    if (existing?.accessToken) continue;

    const authData: AuthData = {};
    if (entry.accessToken) authData.accessToken = entry.accessToken as string;
    if (entry.auth && typeof entry.auth === 'object') {
      const auth = entry.auth as Record<string, string>;
      authData.auth = {};
      if (auth.clientId) authData.auth.clientId = auth.clientId;
      if (auth.clientSecret) authData.auth.clientSecret = auth.clientSecret;
    }
    if (entry.pendingCodeVerifier) authData.pendingCodeVerifier = entry.pendingCodeVerifier as string;

    store.set(`mcpServers.${name}`, authData);
    changed = true;
  }

  if (changed) {
    const cleaned = stripOAuthFields(raw);
    writeFileSync(mcpJsonPath, JSON.stringify(cleaned, null, 2) + '\n', 'utf-8');
    console.log(`[auth-storage] Migrated OAuth data to ${getConfigPath()} and stripped from ${mcpJsonPath}`);
  }
}

export function getAuthConfigPath(): string {
  return getConfigPath();
}

/** @internal */
export function resetStoreForTesting(): void {
  _store = null;
}
