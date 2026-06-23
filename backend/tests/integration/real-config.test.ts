import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/index.js';
import type { FastifyInstance } from 'fastify';
import { readFileSync, existsSync } from 'node:fs';

let app: FastifyInstance;

function getConfigPath(): string {
  return process.env.MCP_CONFIG_PATH || '/app/.mcp.json';
}

beforeAll(async () => {
  if (!existsSync(getConfigPath())) {
    console.warn(`WARNING: Config file not found at ${getConfigPath()}. Skipping tests.`);
  }
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('Bitbucket MCP (stdio)', () => {
  it('loads from real config file via GET', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.error).toBeNull();
    const bb = body.clients.find((c: { name: string }) => c.name === 'Bitbucket');
    expect(bb).toBeDefined();
    expect(bb.transport).toBe('stdio');
    expect(bb.command).toBe('npx');
  }, 30_000);

  it('fieldSelection is preserved in the raw file', () => {
    const raw = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
    expect(raw.mcpServers['Bitbucket'].fieldSelection).toBeDefined();
    expect(raw.mcpServers['Bitbucket'].type).toBe('stdio');
    expect(raw.mcpServers['Bitbucket'].command).toBe('npx');
  });
});

describe('Serena MCP (http)', () => {
  it('loads from real config file via GET', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/mcps' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const serena = body.clients.find((c: { name: string }) => c.name === 'Serena');
    expect(serena).toBeDefined();
    expect(serena.transport).toBe('http');
    expect(serena.url).toContain('9121');
  }, 30_000);

  it('fieldSelection is preserved in the raw file', () => {
    const raw = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
    expect(raw.mcpServers['Serena'].fieldSelection).toBeDefined();
    expect(raw.mcpServers['Serena'].type).toBe('http');
    expect(raw.mcpServers['Serena'].url).toContain('9121');
  });
});

describe('PUT /api/mcps preserves extra fields', () => {
  it('updates Bitbucket without losing fieldSelection', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/Bitbucket',
      payload: {
        name: 'Bitbucket',
        transport: { type: 'stdio', command: 'npx', args: ['-y', 'bitbucket-mcp@latest'] },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    const raw = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
    expect(raw.mcpServers['Bitbucket'].fieldSelection).toBeDefined();
    expect(raw.mcpServers['Bitbucket'].type).toBe('stdio');
  });

  it('updates Serena without losing fieldSelection', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/mcps/Serena',
      payload: {
        name: 'Serena',
        transport: { type: 'http', url: 'http://host.docker.internal:9121/mcp' },
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    const raw = JSON.parse(readFileSync(getConfigPath(), 'utf-8'));
    expect(raw.mcpServers['Serena'].fieldSelection).toBeDefined();
    expect(raw.mcpServers['Serena'].type).toBe('http');
    expect(raw.mcpServers['Serena'].url).toBe('http://host.docker.internal:9121/mcp');
  });
});
