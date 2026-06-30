import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendOneMessage } from '../proxy/index.js';
import type { JsonRpcMessage } from '../proxy/types.js';

const MAX_BODY_SIZE = parseInt(
  process.env['WEIR_PROXY_MAX_BODY_SIZE'] || '1048576',
  10,
);

const HTTP_TIMEOUT = parseInt(
  process.env['WEIR_PROXY_HTTP_TIMEOUT'] || '30000',
  10,
);

function isValidJsonRpc(body: unknown): body is JsonRpcMessage {
  if (typeof body !== 'object' || body === null) return false;
  const msg = body as Record<string, unknown>;
  return (
    msg['jsonrpc'] === '2.0' &&
    (typeof msg['id'] === 'number' || typeof msg['id'] === 'string' || msg['id'] === null) &&
    typeof msg['method'] === 'string'
  );
}

export async function proxyRoutes(app: FastifyInstance) {
  app.post('/api/proxy/:name', {
    config: {
      bodyLimit: MAX_BODY_SIZE,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };

    const body = request.body;
    if (!isValidJsonRpc(body)) {
      return reply.status(400).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request: body must be a valid JSON-RPC 2.0 message' },
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

      const result = await sendOneMessage(name, body, controller.signal);
      clearTimeout(timeoutId);

      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('not found in .mcp.json')) {
        return reply.status(404).send({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: `MCP '${name}' not found` },
        });
      }

      if (message.includes('Request aborted') || message.includes('Timeout')) {
        return reply.status(504).send({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32001, message: 'Gateway Timeout: backend did not respond in time' },
        });
      }

      return reply.status(502).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32002, message: `Bad Gateway: ${message}` },
      });
    }
  });

  const methodNotAllowed = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(405).send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Method Not Allowed: only POST is accepted' },
    });
  };

  app.get('/api/proxy/:name', methodNotAllowed);
  app.put('/api/proxy/:name', methodNotAllowed);
  app.delete('/api/proxy/:name', methodNotAllowed);
  app.patch('/api/proxy/:name', methodNotAllowed);
}
