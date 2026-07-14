import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';
import { ToolVisibilityConfig } from '../config/schema.js';
import type { ToolVisibilityMap, ToolWithVisibility } from '../config/types.js';

const logger = pino({ name: 'weir-tool-visibility' });

const CONFIG_FILE = 'tool-visibility.json';

function getConfigPath(configDir: string): string {
  return join(configDir, CONFIG_FILE);
}

export function loadToolVisibility(configDir: string): ToolVisibilityMap {
  const configPath = getConfigPath(configDir);

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const result = ToolVisibilityConfig.safeParse(parsed);

    if (!result.success) {
      logger.warn({ errors: result.error.errors }, 'Invalid tool-visibility.json, falling back to empty config');
      return {};
    }

    return result.data;
  } catch (err) {
    logger.warn({ err }, 'Failed to read tool-visibility.json, falling back to empty config');
    return {};
  }
}

export function saveToolVisibility(configDir: string, map: ToolVisibilityMap): void {
  const configPath = getConfigPath(configDir);
  writeFileSync(configPath, JSON.stringify(map, null, 2) + '\n', 'utf-8');
}

export function getToolEnabled(configDir: string, mcpName: string, toolName: string): boolean {
  const map = loadToolVisibility(configDir);
  return map[mcpName]?.[toolName] ?? true;
}

export function setToolEnabled(configDir: string, mcpName: string, toolName: string, enabled: boolean): void {
  const map = loadToolVisibility(configDir);

  if (!map[mcpName]) {
    map[mcpName] = {};
  }

  map[mcpName][toolName] = enabled;
  saveToolVisibility(configDir, map);
}

export function setBulkVisibility(configDir: string, mcpName: string, toolNames: string[], enabled: boolean): void {
  const map = loadToolVisibility(configDir);

  if (toolNames.length === 0) {
    return;
  }

  if (!map[mcpName]) {
    map[mcpName] = {};
  }

  for (const toolName of toolNames) {
    map[mcpName][toolName] = enabled;
  }

  saveToolVisibility(configDir, map);
}

export function filterTools<T extends { name: string }>(
  configDir: string,
  mcpName: string,
  tools: T[],
): T[] {
  const map = loadToolVisibility(configDir);
  const visibility = map[mcpName];

  if (!visibility) {
    return tools;
  }

  return tools.filter((tool) => visibility[tool.name] ?? true);
}

export function filterToolsListResponse(
  configDir: string,
  mcpName: string,
  result: { tools?: Array<{ name: string }> },
): { tools?: Array<{ name: string }> } {
  if (!result.tools || !Array.isArray(result.tools)) {
    return result;
  }

  const map = loadToolVisibility(configDir);
  const visibility = map[mcpName];

  if (!visibility) {
    return result;
  }

  return {
    ...result,
    tools: result.tools.filter((tool) => visibility[tool.name] ?? true),
  };
}

export function getVisibilitySummary(configDir: string, mcpName: string, toolNames: string[]): {
  visibility: Record<string, boolean>;
  totalCount: number;
  enabledCount: number;
} {
  const map = loadToolVisibility(configDir);
  const visibility = map[mcpName] ?? {};
  const totalCount = toolNames.length;
  const enabledCount = toolNames.filter((name) => visibility[name] ?? true).length;

  return { visibility, totalCount, enabledCount };
}
