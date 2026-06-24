import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { join, dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mcpRoutes } from './api/mcp.routes.js';
import { healthRoutes } from './api/health.routes.js';
import { setupWebSocket } from './api/ws.js';
import { createWatcher } from './config/watcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === 'test'
        ? false
        : {
            transport: {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
          },
  });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  const ws = setupWebSocket(app);

  const mcpConfigPath = process.env.MCP_CONFIG_PATH || resolve(process.cwd(), '.mcp.json');

  if (!existsSync(mcpConfigPath)) {
    app.log.warn(`Arquivo .mcp.json nao encontrado em: ${mcpConfigPath}`);
  }

  const watcher = createWatcher(
    mcpConfigPath,
    () => {
      ws.broadcast('config:changed', { path: mcpConfigPath });
      app.log.info('Config changed, broadcasting');
    },
    (deletedPath) => {
      ws.broadcast('config:deleted', { path: deletedPath });
      app.log.warn(`Config deleted: ${deletedPath}`);
    },
  );

  await app.register(async (instance) => {
    instance.decorate('ws', ws);
    instance.decorate('watcher', watcher);
  });

  await app.register(mcpRoutes);
  await app.register(healthRoutes);

  const webDir = join(__dirname, 'web');
  await app.register(fastifyStatic, {
    root: webDir,
    prefix: '/',
    wildcard: false,
  });

  return app;
}

export async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`Weir running at http://${host}:${port}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('EADDRINUSE')) {
      console.error(`Erro: Porta ${port} ja esta em uso. Escolha outra porta com PORT=xxxx.`);
    } else if (message.includes('EACCES')) {
      console.error(`Erro: Permissao negada para a porta ${port}. Use uma porta superior a 1024.`);
    } else {
      console.error(`Erro ao iniciar servidor: ${message}`);
    }
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  start();
}
