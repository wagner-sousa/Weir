import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadMCPConfig, getTransportKind } from '../../src/config/loader';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `weir-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadMCPConfig', () => {
  it('returns empty when file does not exist', () => {
    const result = loadMCPConfig('/nonexistent/.mcp.json');
    expect(result.clients).toHaveLength(0);
    expect(result.error).toBeNull();
  });

  it('returns error on invalid JSON', () => {
    writeFileSync(join(tmpDir, '.mcp.json'), 'not json');
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.clients).toHaveLength(0);
    expect(result.error).toContain('Invalid JSON');
  });

  it('returns error on validation failure', () => {
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify({ mcpServers: { bad: {} } }));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.clients).toHaveLength(0);
    expect(result.error).toContain('Validation error');
  });

  it('parses valid stdio config', () => {
    const config = {
      mcpServers: {
        filesystem: {
          transport: { type: 'stdio', command: 'npx', args: ['-y', 'server-fs'] },
        },
      },
    };
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify(config));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.error).toBeNull();
    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].name).toBe('filesystem');
    expect(result.clients[0].transport).toBe('stdio');
    expect(result.clients[0].command).toBe('npx');
    expect(result.clients[0].args).toEqual(['-y', 'server-fs']);
  });

  it('parses valid http config', () => {
    const config = {
      mcpServers: {
        myapi: {
          transport: { type: 'http', url: 'https://api.example.com/mcp' },
        },
      },
    };
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify(config));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.error).toBeNull();
    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].name).toBe('myapi');
    expect(result.clients[0].transport).toBe('http');
    expect(result.clients[0].url).toBe('https://api.example.com/mcp');
  });

  it('parses multiple servers', () => {
    const config = {
      mcpServers: {
        a: { transport: { type: 'stdio', command: 'echo' } },
        b: { transport: { type: 'http', url: 'https://b.example.com' } },
      },
    };
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify(config));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.error).toBeNull();
    expect(result.clients).toHaveLength(2);
  });

  it('returns empty clients for empty mcpServers', () => {
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify({ mcpServers: {} }));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.error).toBeNull();
    expect(result.clients).toHaveLength(0);
  });

  it('parses flat format (no transport wrapper)', () => {
    const config = {
      mcpServers: {
        filesystem: { type: 'stdio', command: 'npx', args: ['-y', 'server-fs'] },
      },
    };
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify(config));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.error).toBeNull();
    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].name).toBe('filesystem');
    expect(result.clients[0].transport).toBe('stdio');
    expect(result.clients[0].command).toBe('npx');
    expect(result.clients[0].args).toEqual(['-y', 'server-fs']);
  });

  it('parses flat http config', () => {
    const config = {
      mcpServers: {
        myapi: { type: 'http', url: 'https://api.example.com/mcp' },
      },
    };
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify(config));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.error).toBeNull();
    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].transport).toBe('http');
    expect(result.clients[0].url).toBe('https://api.example.com/mcp');
  });

  it('parses mixed flat and nested formats in same file', () => {
    const config = {
      mcpServers: {
        flat: { type: 'stdio', command: 'echo' },
        nested: { transport: { type: 'http', url: 'https://example.com' } },
        flat_sse: { type: 'sse', url: 'https://events.example.com/stream' },
      },
    };
    writeFileSync(join(tmpDir, '.mcp.json'), JSON.stringify(config));
    const result = loadMCPConfig(join(tmpDir, '.mcp.json'));
    expect(result.error).toBeNull();
    expect(result.clients).toHaveLength(3);
    expect(result.clients[0].transport).toBe('stdio');
    expect(result.clients[1].transport).toBe('http');
    expect(result.clients[2].transport).toBe('sse');
  });
});

describe('getTransportKind', () => {
  it('returns stdio for stdio', () => {
    expect(getTransportKind('stdio')).toBe('stdio');
  });

  it('returns http for http', () => {
    expect(getTransportKind('http')).toBe('http');
  });

  it('returns sse for sse', () => {
    expect(getTransportKind('sse')).toBe('sse');
  });

  it('returns unknown for unknown types', () => {
    expect(getTransportKind('unknown')).toBe('unknown');
    expect(getTransportKind('something-else')).toBe('unknown');
  });
});
