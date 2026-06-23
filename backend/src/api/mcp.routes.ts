import type { FastifyInstance } from 'fastify';
import { loadMCPConfig } from '../config/loader.js';
import { writeMCPConfig, addMCPEntry, removeMCPEntry } from '../config/writer.js';
import { TestConnectionRequest } from '../config/schema.js';
import { testConnection, queryTools } from '../services/mcp-client.js';
import { getCachedStatus, setCachedStatus, deleteCachedStatus } from '../services/status-cache.js';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { broadcast } from './ws.js';
import type { MCPClient, CachedStatus, StatusUpdate } from '../config/types.js';

function getConfigPath(): string {
  return process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');
}

function broadcastStatusUpdate(name: string, status: CachedStatus): void {
  const mappedStatus: StatusUpdate['status'] = status.status === 'needsAuth' ? 'error' : status.status as StatusUpdate['status'];
  const update: StatusUpdate = {
    name,
    status: mappedStatus,
    error: status.error,
    toolCount: status.toolCount,
  };
  broadcast('status', update);
}

async function testSingleMCP(name: string): Promise<CachedStatus> {
  const configPath = getConfigPath();
  const result = loadMCPConfig(configPath);
  const client = result.clients.find((c) => c.name === name);
  if (!client) {
    const status: CachedStatus = { status: 'error', error: 'MCP not found', toolCount: 0, needsAuth: false, authUrl: null, lastTestedAt: Date.now() };
    return status;
  }

  const raw = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf-8')) : { mcpServers: {} };
  const rawEntry = raw.mcpServers[name];
  const accessToken: string | undefined = rawEntry?.accessToken;

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
      // tools query failed, leave count as 0
    }
  }

  const cached: CachedStatus = {
    status: connResult.success ? 'connected' : connResult.needsAuth ? 'needsAuth' : ('error' as 'connected' | 'error' | 'needsAuth'),
    error: connResult.error ?? null,
    toolCount,
    needsAuth: connResult.needsAuth ?? false,
    authUrl: connResult.authUrl ?? null,
    lastTestedAt: Date.now(),
  };

  setCachedStatus(name, cached);
  return cached;
}

export async function mcpRoutes(app: FastifyInstance) {
  app.get('/api/mcps', async (_request, _reply) => {
    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);

    const clientsWithStatus = result.clients.map((client: MCPClient) => {
      const cached = getCachedStatus(client.name);
      return {
        ...client,
        status: cached?.status ?? 'unknown',
        error: cached?.error ?? null,
        toolCount: cached?.toolCount ?? 0,
        needsAuth: cached?.needsAuth ?? false,
        authUrl: cached?.authUrl ?? null,
      };
    });

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

    // Look up stored accessToken if name is provided
    const configPath = getConfigPath();
    let accessToken: string | undefined;
    if (parsed.data.name) {
      const raw = existsSync(configPath)
        ? JSON.parse(readFileSync(configPath, 'utf-8'))
        : { mcpServers: {} };
      accessToken = raw.mcpServers[parsed.data.name]?.accessToken;
    }

    const result = await testConnection({ ...parsed.data.transport, accessToken });

    // Cache result and broadcast if MCP name is known
    if (parsed.data.name) {
      setCachedStatus(parsed.data.name, {
        status: result.success ? 'connected' : result.needsAuth ? 'needsAuth' : 'error',
        error: result.error ?? null,
        toolCount: 0,
        needsAuth: result.needsAuth ?? false,
        authUrl: result.authUrl ?? null,
      });
    }

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

    // Test only the newly created MCP asynchronously
    testSingleMCP(name as string).then((status) => broadcastStatusUpdate(name as string, status));

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

    const raw = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, 'utf-8'))
      : { mcpServers: {} };
    const accessToken: string | undefined = raw.mcpServers[name]?.accessToken;

    const tools = await queryTools(name, {
      type: client.transport as 'stdio' | 'http' | 'sse',
      command: client.command,
      args: client.args,
      url: client.url,
      env: client.env,
      accessToken,
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

    // Test only the updated MCP asynchronously
    testSingleMCP(name as string).then((status) => broadcastStatusUpdate(name as string, status));

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
      deleteCachedStatus(name);
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

    const configPath = getConfigPath();

    const sendStatuses = async () => {
      const result = loadMCPConfig(configPath);
      if (result.error || !result.clients) return;

      // Test all MCPs concurrently
      const tests = result.clients.map(async (client: MCPClient) => {
        // Emit testing event
        reply.raw.write(`event: testing\ndata: ${JSON.stringify({ name: client.name })}\n\n`);

        const status = await testSingleMCP(client.name);
        const sseStatus: StatusUpdate['status'] = status.status === 'needsAuth' ? 'error' : status.status as StatusUpdate['status'];
        const update: StatusUpdate = {
          name: client.name,
          status: sseStatus,
          error: status.error,
          toolCount: status.toolCount,
        };
        reply.raw.write(`event: status\ndata: ${JSON.stringify(update)}\n\n`);
      });

      await Promise.allSettled(tests);
    };

    await sendStatuses();

    const pollInterval = setInterval(sendStatuses, parseInt(process.env.MCP_CACHE_TTL ?? '60000', 10));
    const keepalive = setInterval(() => {
      reply.raw.write(': keepalive\n\n');
    }, 15_000);

    _request.raw.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(keepalive);
    });
  });
}
