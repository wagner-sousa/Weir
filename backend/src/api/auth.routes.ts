import type { FastifyInstance } from 'fastify';
import { loadMCPConfig } from '../config/loader.js';
import { writeMCPConfig } from '../config/writer.js';
import { discoverOAuth2, testConnection, queryTools } from '../services/mcp-client.js';
import { setCachedStatus } from '../services/status-cache.js';
import { getAuthConfig, setAuthConfig } from '../services/auth-storage.js';
import { broadcast } from './ws.js';
import { randomBytes, createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import type { CachedStatus, StatusUpdate } from '../config/types.js';

function getConfigPath(): string {
  return process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');
}

async function registerClient(
  registrationEndpoint: string,
  redirectUri: string,
  name: string,
): Promise<string> {
  const body = {
    client_name: `Weir-${name}`,
    redirect_uris: [redirectUri],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };

  const res = await fetch(registrationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Client registration failed: HTTP ${res.status} — ${errText}`);
  }

  const data = await res.json();
  if (!data.client_id) {
    throw new Error('Registration response missing client_id');
  }

  return data.client_id;
}

function readRawConfig(configPath: string): { mcpServers: Record<string, Record<string, unknown>> } {
  return existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, 'utf-8'))
    : { mcpServers: {} };
}

function saveRawConfig(configPath: string, raw: Record<string, unknown>): void {
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeMCPConfig(configPath, raw as never);
}

function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function testSingleMCPAndBroadcast(name: string): Promise<void> {
  try {
    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);
    const client = result.clients.find((c) => c.name === name);
    if (!client || !client.url) return;

    const raw = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf-8')) : { mcpServers: {} };
    const rawEntry = raw.mcpServers[name];
    const authConfig = getAuthConfig(name);
    const accessToken: string | undefined = authConfig?.accessToken || rawEntry?.accessToken;

    const connResult = await testConnection({
      type: client.transport as 'stdio' | 'http' | 'sse',
      command: client.command,
      args: client.args,
      url: client.url,
      env: client.env,
      accessToken,
    });

    let toolCount = 0;
    if (connResult.success) {
      try {
        const tools = await queryTools(name, {
          type: client.transport as 'stdio' | 'http' | 'sse',
          command: client.command,
          args: client.args,
          url: client.url,
          env: client.env,
          accessToken,
        });
        toolCount = tools.length;
      } catch {
        // tools query failed
      }
    }

    const cached: CachedStatus = {
      status: connResult.success ? 'connected' : connResult.needsAuth ? 'needsAuth' : 'error',
      error: connResult.error ?? null,
      toolCount,
      needsAuth: connResult.needsAuth ?? false,
      authUrl: connResult.authUrl ?? null,
      lastTestedAt: Date.now(),
    };
    setCachedStatus(name, cached);

    const update: StatusUpdate = {
      name,
      status: cached.status === 'needsAuth' ? 'error' : cached.status,
      error: cached.error,
      toolCount: cached.toolCount,
    };
    broadcast('status', update);
    broadcast('config:changed', { path: getConfigPath() });
  } catch {
    // background test failed silently
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/:name/start', async (request, reply) => {
    const { name } = request.params as { name: string };
    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);
    const client = result.clients.find((c) => c.name === name);

    if (!client) {
      return reply.status(404).send({ success: false, error: `MCP '${name}' not found.` });
    }

    if (!client.url) {
      return reply.status(400).send({ success: false, error: 'No URL configured for this MCP.' });
    }

    const authConfig = await discoverOAuth2(client.url);
    if (!authConfig) {
      return reply.status(400).send({ success: false, error: 'No OAuth2 configuration available for this MCP.' });
    }

    const raw = readRawConfig(configPath);
    const rawEntry: Record<string, unknown> = raw.mcpServers[name] ?? {};
    const authEntry = rawEntry.auth as Record<string, string> | undefined;
    let clientId: string | undefined = authEntry?.clientId;
    const host = request.headers.host || request.hostname;
    const redirectUri = `${request.protocol}://${host}/api/auth/${encodeURIComponent(name)}/callback`;

    // Auto-register if clientId is missing and registration endpoint is available
    if (!clientId && authConfig.registrationEndpoint) {
      try {
        clientId = await registerClient(authConfig.registrationEndpoint, redirectUri, name);
        const entry: Record<string, unknown> = raw.mcpServers[name] ??= {};
        if (!entry.auth) entry.auth = {};
        (entry.auth as Record<string, string>).clientId = clientId;
        saveRawConfig(configPath, raw);
        setAuthConfig(name, { auth: { clientId } });
      } catch (err) {
        return {
          success: false,
          url: null,
          error: err instanceof Error ? err.message : 'Client registration failed',
        };
      }
    }

    if (!clientId) {
      return {
        success: false,
        url: null,
        error: `No client_id configured for MCP '${name}' and no registration endpoint available. Configure auth.clientId in .mcp.json manually.`,
      };
    }

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store code_verifier in the entry for use in the callback
    const entry: Record<string, unknown> = raw.mcpServers[name] ??= {};
    entry.pendingCodeVerifier = codeVerifier;
    saveRawConfig(configPath, raw);
    setAuthConfig(name, { pendingCodeVerifier: codeVerifier });

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: redirectUri,
    });
    params.set('client_id', clientId);
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
    if (authConfig.scopesSupported && authConfig.scopesSupported.length > 0) {
      params.set('scope', authConfig.scopesSupported.join(' '));
    }

    const authUrl = `${authConfig.authorizationEndpoint}?${params.toString()}`;

    return { success: true, url: authUrl };
  });

  app.get('/api/auth/:name/callback', async (request, reply) => {
    const { name } = request.params as { name: string };
    const { code, error: authError } = request.query as { code?: string; error?: string };

    if (authError) {
      return reply.type('text/html').send(
        `<html><body><p>Authorization failed: ${authError}</p></body></html>`,
      );
    }

    if (!code) {
      return reply.type('text/html').send(
        `<html><body><p>No authorization code received.</p></body></html>`,
      );
    }

    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);
    const client = result.clients.find((c) => c.name === name);

    if (!client || !client.url) {
      return reply.type('text/html').send(
        `<html><body><p>MCP '${name}' not found.</p></body></html>`,
      );
    }

    // Discover OAuth2 config
    const authConfig = await discoverOAuth2(client.url);
    if (!authConfig) {
      return reply.type('text/html').send(
        `<html><body><p>OAuth2 configuration not found for this MCP.</p></body></html>`,
      );
    }

    // Read raw config for client credentials and PKCE verifier (from auth-storage or .mcp.json fallback)
    const raw = readRawConfig(configPath);
    const rawEntry = raw.mcpServers[name] as Record<string, unknown> | undefined;
    const authCfg = getAuthConfig(name);
    const authEntry = authCfg?.auth || (rawEntry?.auth as Record<string, string> | undefined);
    const clientId = authCfg?.auth?.clientId || (rawEntry?.auth as Record<string, string> | undefined)?.clientId || '';
    const clientSecret = authCfg?.auth?.clientSecret || (rawEntry?.auth as Record<string, string> | undefined)?.clientSecret || '';
    const codeVerifier = authCfg?.pendingCodeVerifier || (rawEntry?.pendingCodeVerifier as string | undefined);
    const host = request.headers.host || request.hostname;
    const redirectUri = `${request.protocol}://${host}/api/auth/${encodeURIComponent(name)}/callback`;

    // Exchange authorization code for token
    try {
      const tokenParams: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
      };
      if (clientSecret) {
        tokenParams.client_secret = clientSecret;
      }
      if (codeVerifier) {
        tokenParams.code_verifier = codeVerifier;
      }

      const tokenResponse = await fetch(authConfig.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams).toString(),
      });

      // Clean up stored code_verifier regardless of outcome
      if (rawEntry) {
        delete rawEntry.pendingCodeVerifier;
        saveRawConfig(configPath, raw);
      }
      // Also clean from auth-storage
      const currentAuth = getAuthConfig(name);
      if (currentAuth) {
        const { pendingCodeVerifier: _, ...rest } = currentAuth;
        setAuthConfig(name, rest);
      }

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        return reply.type('text/html').send(
          `<html><body><p>Token exchange failed: HTTP ${tokenResponse.status} — ${errText}</p></body></html>`,
        );
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return reply.type('text/html').send(
          `<html><body><p>No access token received in response.</p></body></html>`,
        );
      }

      // Store token in .mcp.json
      if (rawEntry) {
        rawEntry.accessToken = accessToken;
        saveRawConfig(configPath, raw);
        setAuthConfig(name, { accessToken });
      }

      // Test the MCP now that it has a token, cache result, and broadcast
      testSingleMCPAndBroadcast(name);

      return reply.type('text/html').send(
        `<html><body><script>window.close()</script><p>Authorization successful. You may close this window.</p></body></html>`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.type('text/html').send(
        `<html><body><p>Token exchange failed: ${msg}</p></body></html>`,
      );
    }
  });
}
