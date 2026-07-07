import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mcpRoutes } from '../../src/api/mcp.routes.js';

describe('Projection API endpoints', () => {
  let tmpDir: string;
  let configPath: string;
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    tmpDir = join(tmpdir(), `weir-proj-api-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    configPath = join(tmpDir, '.mcp.json');

    // Create a basic .mcp.json
    writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        testServer: {
          transport: { type: 'stdio', command: 'echo' },
        },
      },
    }));

    process.env.MCP_CONFIG_PATH = configPath;

    app = Fastify();
    await app.register(mcpRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.MCP_CONFIG_PATH;
  });

  beforeEach(() => {
    // Clean up field-projection.json before each test
    const fpPath = join(tmpDir, 'field-projection.json');
    if (existsSync(fpPath)) {
      rmSync(fpPath);
    }
  });

  describe('GET /api/mcps/:name/projections', () => {
    it('returns empty projections when file does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/mcps/testServer/projections',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ projections: {} });
    });

    it('returns projections for existing server', async () => {
      const fpPath = join(tmpDir, 'field-projection.json');
      writeFileSync(fpPath, JSON.stringify({
        testServer: {
          getRepo: { mode: 'include', fields: ['id', 'name'] },
        },
      }));

      const res = await app.inject({
        method: 'GET',
        url: '/api/mcps/testServer/projections',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        projections: {
          getRepo: { mode: 'include', fields: ['id', 'name'] },
        },
      });
    });

    it('returns empty projections for server without projections', async () => {
      const fpPath = join(tmpDir, 'field-projection.json');
      writeFileSync(fpPath, JSON.stringify({
        otherServer: {
          tool: { mode: 'include', fields: ['id'] },
        },
      }));

      const res = await app.inject({
        method: 'GET',
        url: '/api/mcps/testServer/projections',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ projections: {} });
    });
  });

  describe('POST /api/mcps/:name/projections/:toolName', () => {
    it('creates field-projection.json when it does not exist', async () => {
      const fpPath = join(tmpDir, 'field-projection.json');
      expect(existsSync(fpPath)).toBe(false);

      const res = await app.inject({
        method: 'POST',
        url: '/api/mcps/testServer/projections/getRepo',
        payload: { mode: 'include', fields: ['id', 'name'] },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        success: true,
        name: 'testServer',
        toolName: 'getRepo',
        selection: { mode: 'include', fields: ['id', 'name'] },
      });

      expect(existsSync(fpPath)).toBe(true);
      const data = JSON.parse(readFileSync(fpPath, 'utf-8'));
      expect(data).toEqual({
        testServer: { getRepo: { mode: 'include', fields: ['id', 'name'] } },
      });
    });

    it('preserves existing entries when adding new projection', async () => {
      const fpPath = join(tmpDir, 'field-projection.json');
      writeFileSync(fpPath, JSON.stringify({
        otherServer: { tool: { mode: 'exclude', fields: ['secret'] } },
      }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/mcps/testServer/projections/getRepo',
        payload: { mode: 'include', fields: ['id'] },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(readFileSync(fpPath, 'utf-8'));
      expect(data).toEqual({
        otherServer: { tool: { mode: 'exclude', fields: ['secret'] } },
        testServer: { getRepo: { mode: 'include', fields: ['id'] } },
      });
    });

    it('returns 404 for non-existent MCP', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/mcps/nonexistent/projections/tool',
        payload: { mode: 'include', fields: ['id'] },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().success).toBe(false);
    });

    it('returns 400 for invalid projection', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/mcps/testServer/projections/tool',
        payload: { mode: 'invalid', fields: ['id'] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().success).toBe(false);
    });

    it('returns 400 for empty fields array', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/mcps/testServer/projections/tool',
        payload: { mode: 'include', fields: [] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().success).toBe(false);
    });

    it('returns 400 for invalid JSONPath', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/mcps/testServer/projections/tool',
        payload: { mode: 'include', fields: ['invalid['] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().success).toBe(false);
    });
  });

  describe('DELETE /api/mcps/:name/projections/:toolName', () => {
    it('removes projection and returns success', async () => {
      const fpPath = join(tmpDir, 'field-projection.json');
      writeFileSync(fpPath, JSON.stringify({
        testServer: { getRepo: { mode: 'include', fields: ['id'] } },
      }));

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/mcps/testServer/projections/getRepo',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ success: true });

      const data = JSON.parse(readFileSync(fpPath, 'utf-8'));
      expect(data).toEqual({});
    });

    it('returns 404 when projection does not exist', async () => {
      const fpPath = join(tmpDir, 'field-projection.json');
      writeFileSync(fpPath, JSON.stringify({
        testServer: { otherTool: { mode: 'include', fields: ['id'] } },
      }));

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/mcps/testServer/projections/nonexistent',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().success).toBe(false);
    });

    it('returns 404 when file does not exist', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/mcps/testServer/projections/tool',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().success).toBe(false);
    });

    it('preserves other projections when removing one', async () => {
      const fpPath = join(tmpDir, 'field-projection.json');
      writeFileSync(fpPath, JSON.stringify({
        testServer: {
          tool1: { mode: 'include', fields: ['a'] },
          tool2: { mode: 'exclude', fields: ['b'] },
        },
      }));

      await app.inject({
        method: 'DELETE',
        url: '/api/mcps/testServer/projections/tool1',
      });

      const data = JSON.parse(readFileSync(fpPath, 'utf-8'));
      expect(data).toEqual({
        testServer: {
          tool2: { mode: 'exclude', fields: ['b'] },
        },
      });
    });
  });
});
