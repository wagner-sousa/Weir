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
import { AuthorizationCode } from 'simple-oauth2';
import type { AuthorizationTokenConfig, Token } from 'simple-oauth2';

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

function createOAuth2Client(
  clientId: string,
  clientSecret: string | undefined,
  authorizationEndpoint: string,
  tokenEndpoint: string,
): AuthorizationCode {
  const authUrl = new URL(authorizationEndpoint);
  const tokenUrl = new URL(tokenEndpoint);

  return new AuthorizationCode({
    client: { id: clientId, secret: clientSecret },
    auth: {
      authorizeHost: authUrl.origin,
      authorizePath: authUrl.pathname,
      tokenHost: tokenUrl.origin,
      tokenPath: tokenUrl.pathname,
    },
    options: {
      bodyFormat: 'form',
      authorizationMethod: 'body',
    },
  });
}

async function refreshTokenIfExpired(name: string, clientUrl: string): Promise<void> {
  const authData = getAuthConfig(name);
  if (!authData?.refreshToken || !authData.expiresAt) return;

  // Check if token is expired (with 5 min buffer)
  if (Date.now() < authData.expiresAt - 300_000) return;

  const authConfig = await discoverOAuth2(clientUrl);
  if (!authConfig) return;

  const clientId = authData.auth?.clientId;
  if (!clientId) return;

  const oauth2 = createOAuth2Client(
    clientId,
    authData.auth?.clientSecret,
    authConfig.authorizationEndpoint,
    authConfig.tokenEndpoint,
  );

  try {
    const token = oauth2.createToken({
      access_token: authData.accessToken || '',
      refresh_token: authData.refreshToken,
      expires_in: Math.floor((authData.expiresAt - Date.now()) / 1000),
    });

    if (token.expired()) {
      const refreshed = await token.refresh();
      const refreshedData = refreshed.token;
      setAuthConfig(name, {
        accessToken: refreshedData.access_token as string,
        refreshToken: refreshedData.refresh_token as string | undefined,
        expiresAt: refreshedData.expires_in
          ? Date.now() + (refreshedData.expires_in as number) * 1000
          : undefined,
      });
    }
  } catch {
    // Refresh failed — will try again next time
  }
}

async function testSingleMCPAndBroadcast(name: string): Promise<void> {
  try {
    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);
    const client = result.clients.find((c) => c.name === name);
    if (!client || !client.url) return;

    // Refresh token if expired before testing
    await refreshTokenIfExpired(name, client.url);

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
    const codeVerifier = randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Store code_verifier in auth-storage for use in callback
    setAuthConfig(name, { pendingCodeVerifier: codeVerifier });

    const oauth2 = createOAuth2Client(
      clientId,
      authEntry?.clientSecret,
      authConfig.authorizationEndpoint,
      authConfig.tokenEndpoint,
    );

    const authorizationUri = oauth2.authorizeURL({
      redirect_uri: redirectUri,
      scope: authConfig.scopesSupported?.join(' ') || undefined,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return { success: true, url: authorizationUri };
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

    // Read client credentials and PKCE verifier from auth-storage
    const stored = getAuthConfig(name);
    const clientId = stored?.auth?.clientId || '';
    const clientSecret = stored?.auth?.clientSecret || '';
    const codeVerifier = stored?.pendingCodeVerifier;
    const host = request.headers.host || request.hostname;
    const redirectUri = `${request.protocol}://${host}/api/auth/${encodeURIComponent(name)}/callback`;

    // Clean up stored code_verifier
    if (stored) {
      const { pendingCodeVerifier: _, ...rest } = stored;
      setAuthConfig(name, rest);
    }

    // Exchange authorization code for token using simple-oauth2
    try {
      const oauth2 = createOAuth2Client(
        clientId,
        clientSecret || undefined,
        authConfig.authorizationEndpoint,
        authConfig.tokenEndpoint,
      );

      const tokenParams: AuthorizationTokenConfig = {
        code,
        redirect_uri: redirectUri,
      };
      if (codeVerifier) {
        // simple-oauth2 uses code_verifier in getToken options
        (tokenParams as Record<string, string>).code_verifier = codeVerifier;
      }

      const tokenResult = await oauth2.getToken(tokenParams);
      const tokenData = tokenResult.token;
      const accessToken = tokenData.access_token as string;
      const refreshToken = tokenData.refresh_token as string | undefined;
      const expiresIn = tokenData.expires_in as number | undefined;

      if (!accessToken) {
        return reply.type('text/html').send(
          `<html><body><p>No access token received in response.</p></body></html>`,
        );
      }

      // Store tokens in auth-storage
      const authData: Record<string, unknown> = { accessToken };
      if (refreshToken) authData.refreshToken = refreshToken;
      if (expiresIn) authData.expiresAt = Date.now() + expiresIn * 1000;
      setAuthConfig(name, authData);

      // Optimistic update: set status to connected immediately
      setCachedStatus(name, {
        status: 'connected',
        error: null,
        toolCount: 0,
        needsAuth: false,
        authUrl: null,
      });
      broadcast('status', { name, status: 'connected', error: null, toolCount: 0 });
      broadcast('config:changed', { path: getConfigPath() });

      // Try to create a token object for potential refresh
      try {
        const token = oauth2.createToken(tokenData);
        if (token.expired() && token.token.refresh_token) {
          const refreshed = await token.refresh();
          const refreshedData = refreshed.token;
          setAuthConfig(name, {
            accessToken: refreshedData.access_token as string,
            refreshToken: refreshedData.refresh_token as string | undefined,
            expiresAt: refreshedData.expires_in
              ? Date.now() + (refreshedData.expires_in as number) * 1000
              : undefined,
          });
        }
      } catch {
        // Refresh not available or not needed — stored data is sufficient
      }

      // Test the MCP now that it has a token, cache result, and broadcast (background)
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
