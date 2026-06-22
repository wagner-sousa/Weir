import { describe, it, expect } from 'vitest';
import { MCPConfig, TransportConfig } from '../../src/config/schema';

describe('MCPConfig schema', () => {
  it('accepts valid stdio config', () => {
    const input = {
      mcpServers: {
        filesystem: {
          transport: { type: 'stdio', command: 'npx', args: ['-y', 'server-fs'] },
        },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts valid http config', () => {
    const input = {
      mcpServers: {
        myapi: {
          transport: { type: 'http', url: 'https://api.example.com/mcp' },
        },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts valid sse config', () => {
    const input = {
      mcpServers: {
        streamer: {
          transport: { type: 'sse', url: 'https://events.example.com/stream' },
        },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects stdio without command', () => {
    const input = {
      mcpServers: {
        bad: {
          transport: { type: 'stdio' },
        },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects http without url', () => {
    const input = {
      mcpServers: {
        bad: {
          transport: { type: 'http' },
        },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid transport type', () => {
    const input = {
      mcpServers: {
        bad: {
          transport: { type: 'invalid' },
        },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts empty mcpServers', () => {
    const input = { mcpServers: {} };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts multiple servers', () => {
    const input = {
      mcpServers: {
        a: { transport: { type: 'stdio', command: 'echo' } },
        b: { transport: { type: 'http', url: 'https://b.example.com' } },
        c: { transport: { type: 'sse', url: 'https://c.example.com' } },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data.mcpServers)).toHaveLength(3);
    }
  });

  it('accepts flat format (no transport wrapper)', () => {
    const input = {
      mcpServers: {
        filesystem: { type: 'stdio', command: 'npx', args: ['-y', 'server-fs'] },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const entry = result.data.mcpServers.filesystem;
      expect(entry.transport.type).toBe('stdio');
      expect(entry.transport.command).toBe('npx');
      expect(entry.transport.args).toEqual(['-y', 'server-fs']);
    }
  });

  it('accepts flat http config', () => {
    const input = {
      mcpServers: {
        myapi: { type: 'http', url: 'https://api.example.com/mcp' },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mcpServers.myapi.transport.type).toBe('http');
      expect(result.data.mcpServers.myapi.transport.url).toBe('https://api.example.com/mcp');
    }
  });

  it('accepts flat sse config', () => {
    const input = {
      mcpServers: {
        streamer: { type: 'sse', url: 'https://events.example.com/stream' },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mcpServers.streamer.transport.type).toBe('sse');
    }
  });

  it('rejects flat stdio without command', () => {
    const input = {
      mcpServers: {
        bad: { type: 'stdio' },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects flat http without url', () => {
    const input = {
      mcpServers: {
        bad: { type: 'http' },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts mixed flat and nested formats in same file', () => {
    const input = {
      mcpServers: {
        flat: { type: 'stdio', command: 'echo' },
        nested: { transport: { type: 'http', url: 'https://example.com' } },
      },
    };
    const result = MCPConfig.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mcpServers.flat.transport.type).toBe('stdio');
      expect(result.data.mcpServers.nested.transport.type).toBe('http');
    }
  });
});

describe('TransportConfig schema', () => {
  it('validates stdio with command', () => {
    const result = TransportConfig.safeParse({ type: 'stdio', command: 'npx' });
    expect(result.success).toBe(true);
  });

  it('validates http with url', () => {
    const result = TransportConfig.safeParse({ type: 'http', url: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown type', () => {
    const result = TransportConfig.safeParse({ type: 'unknown' });
    expect(result.success).toBe(false);
  });
});
