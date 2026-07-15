import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import pino from 'pino';
import { createProxySession, sendOneMessage, resolveAccessToken, resolveBackendConfig } from '../proxy/index.js';
import { detectAuthRequired } from '../services/mcp-client.js';
import { ToonConverter } from '../toon/converter.js';
import { parseEnvConfig } from '../config/schema.js';
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

async function checkMcpAuth(name: string, reply: FastifyReply): Promise<boolean> {
  const accessToken = resolveAccessToken(name);
  if (!accessToken) {
    try {
      const config = resolveBackendConfig(name);
      const needsAuth = await detectAuthRequired({ type: config.transport, url: config.url });
      if (needsAuth) {
        reply.status(401).send({
          error: `MCP '${name}' requires authentication`,
          needsAuth: true,
        });
        return true;
      }
    } catch {
      // If we can't determine auth status, proceed anyway
    }
  }
  return false;
}

export async function mcpPortRoutes(app: FastifyInstance) {
  app.get('/mcp/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string };

    if (await checkMcpAuth(name, reply)) return;

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
    const postUrl = `/mcp/${name}/message?sessionId=${sessionId}`;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    sessions.set(sessionId, { session, reply });

    reply.raw.write(`event: endpoint\ndata: ${postUrl}\n\n`);

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

    const envConfig = parseEnvConfig();
    const backendConfig = resolveBackendConfig(name);
    const converter = new ToonConverter({
      indent: envConfig.WEIR_TOON_INDENT,
      flattenDepth: envConfig.WEIR_TOON_FLATTEN_DEPTH,
      threshold: envConfig.WEIR_TOON_THRESHOLD,
      outputMode: backendConfig.outputMode || envConfig.WEIR_TOON_OUTPUT_MODE,
      autoConvert: envConfig.WEIR_TOON_AUTO_CONVERT,
    });

    const logger = pino({ name: 'weir-mcp' });

    session.onMessage((msg: JsonRpcMessage) => {
      if (msg.result) {
        try {
          const converted = converter.convertResult(msg.result);
          if (converted.converted && converted.savings) {
            logger.info({ savings: converted.savings }, `TOON: converted ${name}: ${converted.savings.originalTokens}→${converted.savings.toonTokens} tok (${converted.savings.percent}% savings)`);
          }
          reply.raw.write(`event: message\ndata: ${JSON.stringify({ ...msg, result: converted.result })}\n\n`);
          return;
        } catch (_err) {
          logger.warn({ name }, `TOON: conversion failed for ${name}, returning original`);
        }
      }
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

  function handleInitializeLocal(body: JsonRpcMessage, reply: FastifyReply) {
    const params = body.params as { protocolVersion?: string } | undefined;
    const requestedVersion = typeof params?.protocolVersion === 'string' ? params.protocolVersion : '';
    const supportedVersions = ['2025-11-25', '2025-03-26', '2024-11-05'];
    const protocolVersion = supportedVersions.includes(requestedVersion) ? requestedVersion : '2024-11-05';
    return reply.send({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'weir-proxy', version: '0.1.0' },
      },
    });
  }

  async function handleMcpPost(name: string, body: JsonRpcMessage, reply: FastifyReply) {
    if (await checkMcpAuth(name, reply)) return;

    if (!body || typeof body.jsonrpc !== 'string') {
      return reply.status(400).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: 'Invalid Request: body must be a valid JSON-RPC 2.0 message' },
      });
    }

    if (body.method === 'initialize') {
      return handleInitializeLocal(body, reply);
    }

    if (body.method?.startsWith('notifications/')) {
      return reply.status(202).send({});
    }

    try {
      const result = await sendOneMessage(name, body);
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

      return reply.status(502).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32002, message: `Bad Gateway: ${message}` },
      });
    }
  }

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

    if (sessionEntry) {
      if (body.method?.startsWith('notifications/')) {
        return reply.status(202).send({ ok: true });
      }

      try {
        await sessionEntry.session.send(body);
        return reply.status(202).send({ ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(502).send({ error: `Bad Gateway: ${msg}` });
      }
    }

    return handleMcpPost(name, body, reply);
  });

  app.post('/mcp/:name', async (request: FastifyRequest, reply: FastifyReply) => {
    return handleMcpPost(
      (request.params as { name: string }).name,
      request.body as JsonRpcMessage,
      reply,
    );
  });
}
