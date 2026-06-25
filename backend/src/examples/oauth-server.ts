#!/usr/bin/env tsx
import Fastify from 'fastify';

const TOOLS = [
  { name: 'user_info', description: 'Returns authenticated user info', inputSchema: { type: 'object', properties: {} } },
];

const VALID_TOKENS = new Set(['valid-token-123', 'demo-token-456']);

const server = Fastify({ logger: false });

server.get('/auth/authorize', async (req, reply) => {
  const { redirect_uri, state } = req.query as { redirect_uri?: string; state?: string };
  const code = 'auth-code-' + Date.now();
  if (redirect_uri) {
    return reply.redirect(302, `${redirect_uri}?code=${code}&state=${state || ''}`);
  }
  return reply.send({ code, state });
});

server.post('/auth/token', async (req, reply) => {
  const { code } = req.body as { code?: string };
  if (!code) return reply.status(400).send({ error: 'invalid_grant' });
  return reply.send({
    access_token: 'valid-token-123',
    token_type: 'Bearer',
    expires_in: 3600,
  });
});

server.post('/mcp', async (req, reply) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!VALID_TOKENS.has(token)) {
    return reply.status(401).send({ error: 'unauthorized' });
  }

  const body = req.body as { id: number; method: string };
  switch (body.method) {
    case 'initialize':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} } } });
    case 'tools/list':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { tools: TOOLS } });
    case 'tools/call':
      return reply.send({ jsonrpc: '2.0', id: body.id, result: { content: [{ type: 'text', text: 'Authenticated user info from OAuth MCP' }] } });
    default:
      return reply.status(400).send({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } });
  }
});

server.listen({ port: 3103, host: '0.0.0.0' }).then(() => {
  process.stderr.write('OAuth MCP server listening on port 3103\n');
});
