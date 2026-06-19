import type { FastifyInstance } from 'fastify';
import { loadMCPConfig } from '../config/loader';
import { resolve } from 'node:path';

const MCP_CONFIG_PATH = process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');

export async function mcpRoutes(app: FastifyInstance) {
  app.get('/api/mcps', async (_request, _reply) => {
    const result = loadMCPConfig(MCP_CONFIG_PATH);
    return {
      clients: result.clients,
      error: result.error,
      timestamp: new Date().toISOString(),
    };
  });
}
