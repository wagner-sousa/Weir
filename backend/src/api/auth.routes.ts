import type { FastifyInstance } from 'fastify';
import { loadMCPConfig } from '../config/loader.js';
import { writeMCPConfig } from '../config/writer.js';
import { discoverOAuth2 } from '../services/mcp-client.js';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';

function getConfigPath(): string {
  return process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');
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

    // Try to discover OAuth2 config
    if (!client.url) {
      return reply.status(400).send({ success: false, error: 'No URL configured for this MCP.' });
    }

    const authConfig = await discoverOAuth2(client.url);
    if (!authConfig) {
      return reply.status(400).send({ success: false, error: 'No OAuth2 configuration available for this MCP.' });
    }

    // Read raw config for clientId
    const raw = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { mcpServers: {} };
    const rawEntry = raw.mcpServers[name];
    const clientId = rawEntry?.auth?.clientId || '';
    const host = request.headers.host || request.hostname;
    const redirectUri = `${request.protocol}://${host}/api/auth/${encodeURIComponent(name)}/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: (authConfig.scopesSupported || []).join(' ') || 'read',
    });

    const authUrl = `${authConfig.authorizationEndpoint}?${params.toString()}`;

    if (!clientId && authConfig.registrationEndpoint) {
      return {
        url: authUrl,
        warning: `No client_id configured. Register your app at ${authConfig.registrationEndpoint} and add "auth": { "clientId": "<your_client_id>" } to the MCP entry in .mcp.json.`,
      };
    }

    return { url: authUrl };
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

    // Read raw config for client credentials
    const raw = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { mcpServers: {} };
    const rawEntry = raw.mcpServers[name];
    const clientId = rawEntry?.auth?.clientId || '';
    const host = request.headers.host || request.hostname;
    const redirectUri = `${request.protocol}://${host}/api/auth/${encodeURIComponent(name)}/callback`;

    // Exchange authorization code for token
    try {
      const tokenResponse = await fetch(authConfig.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
        }).toString(),
      });

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
      if (raw.mcpServers[name]) {
        raw.mcpServers[name].accessToken = accessToken;
        const dir = dirname(configPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeMCPConfig(configPath, raw);
      }

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
