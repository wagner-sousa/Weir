import { readFileSync, existsSync } from 'node:fs';
import { MCPConfig } from './schema.js';
import type { MCPClient, TransportKind } from './types.js';

export interface LoadResult {
  clients: MCPClient[];
  error: string | null;
}

export function loadMCPConfig(filePath: string): LoadResult {
  if (!existsSync(filePath)) {
    return { clients: [], error: null };
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { clients: [], error: `Failed to read file: ${(err as Error).message}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { clients: [], error: 'Invalid JSON in .mcp.json' };
  }

  const result = MCPConfig.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { clients: [], error: `Validation error: ${issues}` };
  }

  const clients: MCPClient[] = Object.entries(result.data.mcpServers).map(([name, entry]) => {
    const client: MCPClient = { name, transport: entry.transport.type };

    if (entry.transport.command) client.command = entry.transport.command;
    if (entry.transport.args) client.args = entry.transport.args;
    if (entry.transport.url) client.url = entry.transport.url;

    return client;
  });

  return { clients, error: null };
}

export function getTransportKind(type: string): TransportKind {
  const valid: TransportKind[] = ['stdio', 'http', 'sse'];
  return valid.includes(type as TransportKind) ? (type as TransportKind) : 'unknown';
}
