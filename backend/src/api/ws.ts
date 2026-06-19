import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

const clients = new Set<WebSocket>();
let _broadcast: ((event: string, data: unknown) => void) | null = null;

export function setupWebSocket(app: FastifyInstance) {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);
    socket.on('close', () => {
      clients.delete(socket);
    });
  });

  _broadcast = (event: string, data: unknown) => {
    const message = JSON.stringify({ event, data });
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  };

  return { broadcast: _broadcast };
}

export function broadcast(event: string, data: unknown) {
  if (_broadcast) _broadcast(event, data);
}

