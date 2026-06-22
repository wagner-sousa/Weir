import type { FastifyInstance } from 'fastify';
import { loadMCPConfig } from '../config/loader.js';
import { writeMCPConfig, addMCPEntry, removeMCPEntry } from '../config/writer.js';
import { TestConnectionRequest } from '../config/schema.js';
import { testConnection, queryTools, discoverOAuth2 } from '../services/mcp-client.js';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { broadcast } from './ws.js';
import type { MCPClient } from '../config/types.js';

function getConfigPath(): string {
  return process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');
}

export async function mcpRoutes(app: FastifyInstance) {
  app.get('/api/mcps', async (_request, _reply) => {
    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);

    // Read raw config for accessToken
    const raw = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { mcpServers: {} };

    const clientsWithStatus = await Promise.all(
      result.clients.map(async (client: MCPClient) => {
        const rawEntry = raw.mcpServers[client.name];
        const accessToken: string | undefined = rawEntry?.accessToken;

        const connResult = await testConnection({
          type: client.transport as 'stdio' | 'http' | 'sse',
          command: client.command,
          args: client.args,
          url: client.url,
          env: client.env,
          accessToken,
        });

        return {
          ...client,
          status: connResult.success ? 'connected' : ('error' as string),
          error: connResult.error ?? null,
          toolCount: 0,
          needsAuth: connResult.needsAuth ?? false,
          authUrl: connResult.authUrl ?? null,
        };
      }),
    );

    return {
      clients: clientsWithStatus,
      error: result.error,
      timestamp: new Date().toISOString(),
    };
  });

  app.post('/api/mcps/test-connection', async (request, reply) => {
    const parsed = TestConnectionRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.issues.map((i) => i.message).join('; '),
      });
    }

    const result = await testConnection(parsed.data.transport);
    return result;
  });

  app.post('/api/mcps', async (request, reply) => {
    const { name, ...rest } = request.body as Record<string, unknown>;

    if (!name || typeof name !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'Name is required.',
      });
    }

    const configPath = getConfigPath();
    const current = loadMCPConfig(configPath);
    if (current.clients.some((c) => c.name === name)) {
      return reply.status(409).send({
        success: false,
        error: `An MCP with the name '${name}' already exists.`,
      });
    }

    const transportInput = (rest as { transport?: unknown }).transport ?? rest;
    const parsed = TestConnectionRequest.safeParse({ transport: transportInput });
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.issues.map((i) => i.message).join('; '),
      });
    }

    const raw = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { mcpServers: {} };

    const updated = addMCPEntry(raw, name, {
      transport: parsed.data.transport,
    });

    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      writeMCPConfig(configPath, updated);
    } catch {
      return reply.status(503).send({
        success: false,
        error: 'Error saving: backend unavailable.',
      });
    }

    broadcast('config:changed', { path: configPath });

    return reply.status(201).send({ success: true, name });
  });

  app.get('/api/mcps/:name/tools', async (request, reply) => {
    const { name } = request.params as { name: string };
    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);
    const client = result.clients.find((c) => c.name === name);

    if (!client) {
      return reply.status(404).send({ success: false, error: `MCP '${name}' not found.` });
    }

    const tools = await queryTools(name, {
      type: client.transport as 'stdio' | 'http' | 'sse',
      command: client.command,
      args: client.args,
      url: client.url,
      env: client.env,
    });

    return { tools, count: tools.length };
  });

  app.put('/api/mcps/:name', async (request, reply) => {
    const originalName = (request.params as { name: string }).name;
    const { name, ...rest } = request.body as Record<string, unknown>;

    if (!name || typeof name !== 'string') {
      return reply.status(400).send({ success: false, error: 'Name is required.' });
    }

    const configPath = getConfigPath();
    const transportInput = (rest as { transport?: unknown }).transport ?? rest;
    const parsed = TestConnectionRequest.safeParse({ transport: transportInput });
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.issues.map((i) => i.message).join('; '),
      });
    }

    const raw = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { mcpServers: {} };

    if (!raw.mcpServers[originalName]) {
      return reply.status(404).send({
        success: false,
        error: `MCP '${originalName}' not found.`,
      });
    }

    if (name !== originalName && raw.mcpServers[name as string]) {
      return reply.status(409).send({
        success: false,
        error: `An MCP with the name '${name}' already exists.`,
      });
    }

    // Merge: keep all original extra fields (fieldSelection, etc.),
    // update only transport-related fields
    const transportFields = parsed.data.transport;
    const originalEntry = raw.mcpServers[originalName];
    const newEntry: Record<string, unknown> = {};

    // Copy all original keys
    for (const key of Object.keys(originalEntry)) {
      if (key !== 'transport') {
        newEntry[key] = originalEntry[key];
      }
    }

    // Override with new transport data (flat format)
    newEntry.type = transportFields.type;
    if (transportFields.command !== undefined) newEntry.command = transportFields.command;
    if (transportFields.args !== undefined) newEntry.args = transportFields.args;
    if (transportFields.url !== undefined) newEntry.url = transportFields.url;
    if (transportFields.env !== undefined) newEntry.env = transportFields.env;

    // Remove old + write new in one operation
    delete raw.mcpServers[originalName];
    raw.mcpServers[name as string] = newEntry;

    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      writeMCPConfig(configPath, raw);
    } catch {
      return reply.status(503).send({
        success: false,
        error: 'Error saving: backend unavailable.',
      });
    }

    broadcast('config:changed', { path: configPath });
    return { success: true, name: name as string };
  });

  app.delete('/api/mcps/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const configPath = getConfigPath();

    const raw = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { mcpServers: {} };

    try {
      const updated = removeMCPEntry(raw, name);
      try {
        writeMCPConfig(configPath, updated);
      } catch {
        return reply.status(503).send({
          success: false,
          error: 'Error removing: backend unavailable.',
        });
      }
      broadcast('config:changed', { path: configPath });
      return { success: true };
    } catch {
      return reply.status(404).send({
        success: false,
        error: `MCP '${name}' not found.`,
      });
    }
  });

  app.get('/api/mcps/events', async (_request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendStatuses = async () => {
      const configPath = getConfigPath();
      const result = loadMCPConfig(configPath);
      if (result.error || !result.clients) return;

      for (const client of result.clients) {
        try {
          const connResult = await testConnection({
            type: client.transport as 'stdio' | 'http' | 'sse',
            command: client.command,
            args: client.args,
            url: client.url,
            env: client.env,
          });
          const data = JSON.stringify({
            name: client.name,
            status: connResult.success ? 'connected' : 'error',
            toolCount: null,
            error: connResult.error ?? null,
          });
          reply.raw.write(`event: status\ndata: ${data}\n\n`);
        } catch {
          // skip individual failures
        }
      }
      reply.raw.write(`event: done\ndata: null\n\n`);
    };

    await sendStatuses();

    const pollInterval = setInterval(sendStatuses, 30_000);
    const keepalive = setInterval(() => {
      reply.raw.write(': keepalive\n\n');
    }, 15_000);

    _request.raw.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(keepalive);
    });
  });
}
