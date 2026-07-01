import { writeFileSync } from 'node:fs';
import type { MCPConfig, MCPServerEntry } from './types.js';

export function stripOAuthFields(config: MCPConfig): MCPConfig {
  const stripped: MCPConfig = { mcpServers: {} };
  for (const [name, entry] of Object.entries(config.mcpServers)) {
    const cleaned = { ...entry } as Record<string, unknown>;
    delete cleaned.accessToken;
    delete cleaned.auth;
    delete cleaned.pendingCodeVerifier;
    if (cleaned.transport && typeof cleaned.transport === 'object') {
      const t = cleaned.transport as Record<string, unknown>;
      delete t.accessToken;
      delete t.auth;
      delete t.pendingCodeVerifier;
    }
    stripped.mcpServers[name] = cleaned as never;
  }
  return stripped;
}

export function writeMCPConfig(filePath: string, config: MCPConfig): void {
  const cleaned = stripOAuthFields(config);
  writeFileSync(filePath, JSON.stringify(cleaned, null, 2) + '\n', 'utf-8');
}

export function addMCPEntry(
  config: MCPConfig,
  name: string,
  entry: MCPServerEntry,
): MCPConfig {
  if (config.mcpServers[name]) {
    throw new Error(`MCP server "${name}" already exists`);
  }

  return {
    ...config,
    mcpServers: {
      ...config.mcpServers,
      [name]: entry,
    },
  };
}

export function removeMCPEntry(config: MCPConfig, name: string): MCPConfig {
  if (!config.mcpServers[name]) {
    throw new Error(`MCP server "${name}" not found`);
  }

  const { [name]: _removed, ...rest } = config.mcpServers;
  void _removed;
  return {
    ...config,
    mcpServers: rest,
  };
}

export function updateEntry(
  config: MCPConfig,
  originalName: string,
  name: string,
  entry: MCPServerEntry,
): MCPConfig {
  if (!config.mcpServers[originalName]) {
    throw new Error(`MCP server "${originalName}" not found`);
  }

  if (name !== originalName && config.mcpServers[name]) {
    throw new Error(`MCP server "${name}" already exists`);
  }

  const { [originalName]: _removed, ...rest } = config.mcpServers;
  void _removed;

  return {
    ...config,
    mcpServers: {
      ...rest,
      [name]: entry,
    },
  };
}
