#!/usr/bin/env tsx
import Fastify from 'fastify';

const TOOLS = [
  { name: 'greet', description: 'Returns a greeting message', inputSchema: { type: 'object', properties: { name: { type: 'string' } } } },
];

const server = Fastify({ logger: false });

server.post('/mcp', async (req, reply) => {
  const body = req.body as { id: number; method: string };
  switch (body.method) {
    case 'initialize':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} } } });
    case 'tools/list':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { tools: TOOLS } });
    case 'tools/call':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: 'Hello from HTTP MCP!' }] } });
    default:
      return reply.status(400).send({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } });
  }
});

server.get('/health', async () => ({ status: 'ok' }));

server.listen({ port: 3101, host: '0.0.0.0' }).then(() => {
  process.stderr.write('HTTP MCP server listening on port 3101\n');
});
