import { writeFileSync } from 'node:fs';
import type { MCPConfig, MCPServerEntry } from './types.js';

export function writeMCPConfig(filePath: string, config: MCPConfig): void {
  try {
    writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to write config: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
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
