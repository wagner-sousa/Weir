import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeMCPConfig, addMCPEntry, removeMCPEntry, updateEntry } from '../../src/config/writer.js';
import type { MCPConfig } from '../../src/config/types.js';

let tmpDir: string;

function makeConfig(overrides: Partial<MCPConfig> = {}): MCPConfig {
  return {
    mcpServers: {
      filesystem: {
        transport: { type: 'stdio', command: 'npx', args: ['-y', 'server-fs'] },
      },
      ...overrides.mcpServers,
    },
  };
}

beforeEach(() => {
  tmpDir = join(tmpdir(), `weir-writer-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('writeMCPConfig', () => {
  it('writes config file as pretty-printed JSON', () => {
    const filePath = join(tmpDir, '.mcp.json');
    const config = makeConfig();
    writeMCPConfig(filePath, config);
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.mcpServers.filesystem.transport.command).toBe('npx');
  });

  it.skip('throws on permission error', () => {
    const filePath = join(tmpDir, '.mcp.json');
    writeFileSync(filePath, '{}', { mode: 0o444 });
    const config = makeConfig();
    expect(() => writeMCPConfig(filePath, config)).toThrow();
  });
});

describe('addMCPEntry', () => {
  it('adds a new entry to an empty config', () => {
    const config: MCPConfig = { mcpServers: {} };
    const result = addMCPEntry(config, 'new-server', {
      transport: { type: 'http', url: 'https://example.com/mcp' },
    });
    expect(result.mcpServers['new-server']).toBeDefined();
    expect(result.mcpServers['new-server'].transport.type).toBe('http');
  });

  it('adds entry with env vars', () => {
    const config: MCPConfig = { mcpServers: {} };
    const result = addMCPEntry(config, 'my-server', {
      transport: { type: 'stdio', command: 'npx', args: ['mcp'], env: { TOKEN: 'abc' } },
    });
    expect(result.mcpServers['my-server'].transport.env).toEqual({ TOKEN: 'abc' });
  });

  it('throws on duplicate name', () => {
    const config = makeConfig();
    expect(() =>
      addMCPEntry(config, 'filesystem', {
        transport: { type: 'stdio', command: 'echo' },
      }),
    ).toThrow('already exists');
  });

  it('preserves existing entries', () => {
    const config = makeConfig();
    const result = addMCPEntry(config, 'another', {
      transport: { type: 'http', url: 'https://example.com' },
    });
    expect(result.mcpServers['filesystem']).toBeDefined();
    expect(result.mcpServers['another']).toBeDefined();
  });
});

describe('removeMCPEntry', () => {
  it('removes an existing entry', () => {
    const config = makeConfig();
    const result = removeMCPEntry(config, 'filesystem');
    expect(result.mcpServers['filesystem']).toBeUndefined();
  });

  it('throws on nonexistent entry', () => {
    const config: MCPConfig = { mcpServers: {} };
    expect(() => removeMCPEntry(config, 'nonexistent')).toThrow('not found');
  });

  it('preserves other entries', () => {
    const config = makeConfig({
      mcpServers: {
        other: { transport: { type: 'http', url: 'https://other.com' } },
      },
    });
    const result = removeMCPEntry(config, 'filesystem');
    expect(result.mcpServers['other']).toBeDefined();
  });
});

describe('updateEntry', () => {
  it('updates an entry with the same name', () => {
    const config = makeConfig();
    const result = updateEntry(config, 'filesystem', 'filesystem', {
      transport: { type: 'http', url: 'https://updated.com' },
    });
    expect(result.mcpServers['filesystem']).toBeDefined();
    expect(result.mcpServers['filesystem'].transport.type).toBe('http');
    expect(result.mcpServers['filesystem'].transport.url).toBe('https://updated.com');
  });

  it('renames an entry when name differs from originalName', () => {
    const config = makeConfig();
    const result = updateEntry(config, 'filesystem', 'renamed-server', {
      transport: { type: 'stdio', command: 'node' },
    });
    expect(result.mcpServers['filesystem']).toBeUndefined();
    expect(result.mcpServers['renamed-server']).toBeDefined();
    expect(result.mcpServers['renamed-server'].transport.command).toBe('node');
  });

  it('throws when originalName does not exist', () => {
    const config: MCPConfig = { mcpServers: {} };
    expect(() =>
      updateEntry(config, 'nonexistent', 'new-name', {
        transport: { type: 'stdio', command: 'echo' },
      }),
    ).toThrow('not found');
  });

  it('throws when new name conflicts with existing entry', () => {
    const config = makeConfig({
      mcpServers: {
        other: { transport: { type: 'http', url: 'https://other.com' } },
      },
    });
    expect(() =>
      updateEntry(config, 'filesystem', 'other', {
        transport: { type: 'stdio', command: 'echo' },
      }),
    ).toThrow('already exists');
  });

  it('preserves other entries after update', () => {
    const config = makeConfig({
      mcpServers: {
        other: { transport: { type: 'http', url: 'https://other.com' } },
      },
    });
    const result = updateEntry(config, 'filesystem', 'renamed', {
      transport: { type: 'stdio', command: 'node' },
    });
    expect(result.mcpServers['other']).toBeDefined();
    expect(result.mcpServers['renamed']).toBeDefined();
  });
});
