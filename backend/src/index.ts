import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mcpRoutes } from './api/mcp.routes.js';
import { authRoutes } from './api/auth.routes.js';
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

  const watcher = createWatcher(mcpConfigPath, () => {
    ws.broadcast('config:changed', { path: mcpConfigPath });
    app.log.info('Config changed, broadcasting');
  });

  await app.register(async (instance) => {
    instance.decorate('ws', ws);
    instance.decorate('watcher', watcher);
  });

  await app.register(mcpRoutes);
  await app.register(authRoutes);
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
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  start();
}
