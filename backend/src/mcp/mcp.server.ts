import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { mcpPortRoutes } from './mcp.routes.js';

let server: FastifyInstance | null = null;

export async function startMcpServer(port: number): Promise<FastifyInstance> {
  if (server) return server;

  server = Fastify({ logger: false });
  await server.register(cors, { origin: true });
  await server.register(mcpPortRoutes);
  await server.listen({ port, host: '0.0.0.0' });
  return server;
}

export async function stopMcpServer(): Promise<void> {
  if (server) {
    await server.close();
    server = null;
  }
}
