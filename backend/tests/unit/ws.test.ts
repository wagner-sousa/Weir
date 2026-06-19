import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/index';
import { WebSocket } from 'ws';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let port: number;

beforeAll(async () => {
  app = await buildApp();
  port = 9877;
  await app.listen({ port });
});

afterAll(async () => {
  await app.close();
});

describe('WebSocket', () => {
  it('connects to /ws', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        resolve();
      });
      ws.on('error', reject);
    });
  });

  it('receives broadcast messages', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    const { broadcast } = await import('../../src/api/ws');

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        broadcast('config:changed', { file: '.mcp.json' });
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        expect(msg.event).toBe('config:changed');
        expect(msg.data.file).toBe('.mcp.json');
        ws.close();
        resolve();
      });

      ws.on('error', reject);
    });
  });
});
