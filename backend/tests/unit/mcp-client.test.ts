import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  testConnection,
  queryTools,
} from '../../src/services/mcp-client.js';
import type { TransportConfig } from '../../src/config/types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `weir-mcp-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('testConnection', () => {
  it('returns success for stdio with valid command', async () => {
    const transport: TransportConfig = { type: 'stdio', command: 'echo', args: ['hello'] };
    const result = await testConnection(transport);
    expect(result.success).toBe(true);
  });

  it('passes env vars to child process', async () => {
    const transport: TransportConfig = {
      type: 'stdio',
      command: 'sh',
      args: ['-c', 'echo $MY_VAR'],
      env: { MY_VAR: 'test-value' },
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(true);
  });

  it('returns error for nonexistent command', async () => {
    const transport: TransportConfig = {
      type: 'stdio',
      command: 'nonexistent-command-xyz',
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for http connection refused', async () => {
    const transport: TransportConfig = {
      type: 'http',
      url: 'http://localhost:1',
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for sse connection refused', async () => {
    const transport: TransportConfig = {
      type: 'sse',
      url: 'http://localhost:1/sse',
    };
    const result = await testConnection(transport);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('queryTools', () => {
  it('returns empty array when MCP server is not reachable', async () => {
    const transport: TransportConfig = {
      type: 'stdio',
      command: 'echo',
      args: ['not-a-mcp'],
    };
    const result = await queryTools('test-server', transport);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});
