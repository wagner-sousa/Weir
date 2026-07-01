import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createProxySession } from '../proxy/index.js';
import type { JsonRpcMessage, ProxySessionHandle } from '../proxy/types.js';
import { randomBytes } from 'node:crypto';

interface SessionEntry {
  session: ProxySessionHandle;
  reply: FastifyReply;
}

const sessions = new Map<string, SessionEntry>();

function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

export async function mcpPortRoutes(app: FastifyInstance) {
  app.get('/mcp/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };

    let session: ProxySessionHandle;
    try {
      session = createProxySession(name);
    } catch (err) {
      return reply.status(404).send({
        error: `MCP '${name}' not found`,
        message: err instanceof Error ? err.message : String(err),
      });
    }

    const sessionId = generateSessionId();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    sessions.set(sessionId, { session, reply });

    reply.raw.write(`event: endpoint\ndata: /mcp/${name}/message?sessionId=${sessionId}\n\n`);

    try {
      await session.connect();
      reply.raw.write(`event: status\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
      reply.raw.end();
      sessions.delete(sessionId);
      return;
    }

    session.onMessage((msg: JsonRpcMessage) => {
      reply.raw.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
    });

    session.onDisconnect(() => {
      reply.raw.write(`event: status\ndata: ${JSON.stringify({ status: 'reconnecting' })}\n\n`);
    });

    session.onError((err: Error) => {
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    });

    request.raw.on('close', () => {
      session.disconnect();
      sessions.delete(sessionId);
    });

    request.raw.on('error', () => {
      session.disconnect();
      sessions.delete(sessionId);
    });
  });

  app.post('/mcp/:name/message', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };
    const query = request.query as { sessionId?: string };
    const body = request.body as JsonRpcMessage;

    if (!body || typeof body.jsonrpc !== 'string') {
      return reply.status(400).send({
        error: 'Invalid Request: body must be a valid JSON-RPC 2.0 message',
      });
    }

    let sessionEntry: SessionEntry | undefined;
    if (query.sessionId) {
      sessionEntry = sessions.get(query.sessionId);
    } else {
      for (const [, entry] of sessions) {
        if (entry.session.getState() !== 'CLOSED') {
          sessionEntry = entry;
          break;
        }
      }
    }

    if (!sessionEntry) {
      return reply.status(404).send({
        error: `No active SSE session for '${name}'`,
      });
    }

    try {
      await sessionEntry.session.send(body);
      return reply.status(202).send({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(502).send({ error: `Bad Gateway: ${msg}` });
    }
  });
}
