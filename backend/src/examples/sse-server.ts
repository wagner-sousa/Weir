#!/usr/bin/env tsx
import Fastify from 'fastify';

const TOOLS = [
  { name: 'ping', description: 'Returns a pong response', inputSchema: { type: 'object', properties: {} } },
];

let currentId = 1;

const server = Fastify({ logger: false });

server.get('/sse', async (req, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  reply.raw.write(`event: endpoint\ndata: /messages\n\n`);

  const interval = setInterval(() => {
    reply.raw.write(`: keepalive\n\n`);
  }, 15000);

  req.raw.on('close', () => {
    clearInterval(interval);
  });
});

server.post('/messages', async (req, reply) => {
  const body = req.body as { id: number; method: string };
  switch (body.method) {
    case 'initialize':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} } } });
    case 'tools/list':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { tools: TOOLS } });
    case 'tools/call':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: 'Pong from SSE MCP!' }] } });
    default:
      return reply.status(400).send({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } });
  }
});

server.get('/health', async () => ({ status: 'ok' }));

server.listen({ port: 3102, host: '0.0.0.0' }).then(() => {
  process.stderr.write('SSE MCP server listening on port 3102\n');
});
