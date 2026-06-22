import type { FastifyInstance } from 'fastify';
import { loadMCPConfig } from '../config/loader.js';
import { writeMCPConfig, addMCPEntry } from '../config/writer.js';
import { TestConnectionRequest } from '../config/schema.js';
import { testConnection, queryTools } from '../services/mcp-client.js';
import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { broadcast } from './ws.js';
import type { MCPClient } from '../config/types.js';

function getConfigPath(): string {
  return process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');
}

export async function mcpRoutes(app: FastifyInstance) {
  app.get('/api/mcps', async (_request, _reply) => {
    const configPath = getConfigPath();
    const result = loadMCPConfig(configPath);
    const clientsWithStatus = await Promise.all(
      result.clients.map(async (client: MCPClient) => {
        const connResult = await testConnection({
          type: client.transport as 'stdio' | 'http' | 'sse',
          command: client.command,
          args: client.args,
          url: client.url,
          env: client.env,
        });

        return {
          ...client,
          status: connResult.success ? 'connected' : ('error' as string),
          error: connResult.error ?? null,
          toolCount: 0,
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
        error: 'Erro ao salvar: backend indisponível.',
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
}
