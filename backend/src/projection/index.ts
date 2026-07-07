import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { FieldProjectionConfig, FieldSelectionSchema } from '../config/schema.js';
import type { ProjectionMap, FieldSelection } from '../config/types.js';
import { normalizeJsonPath } from './project.js';

function validatePaths(data: ProjectionMap): void {
  const errors: string[] = [];
  for (const [server, tools] of Object.entries(data)) {
    for (const [tool, sel] of Object.entries(tools as Record<string, FieldSelection>)) {
      for (const path of sel.fields) {
        try {
          normalizeJsonPath(path);
        } catch (e) {
          errors.push(`${server}.${tool}.fields: ${(e as Error).message}`);
        }
      }
    }
  }
  if (errors.length) {
    throw new Error(`field-projection.json path validation error${errors.length > 1 ? 's' : ''}: ${errors.join('; ')}`);
  }
}

export function loadFieldProjections(configDir: string): ProjectionMap | null {
  const fpPath = join(configDir, 'field-projection.json');
  if (!existsSync(fpPath)) return null;

  let raw: string;
  try {
    raw = readFileSync(fpPath, 'utf-8');
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in field-projection.json`);
  }

  const result = FieldProjectionConfig.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`field-projection.json validation error: ${issues}`);
  }

  const data = result.data as ProjectionMap;
  validatePaths(data);
  return data;
}

export function saveFieldProjection(
  configDir: string,
  serverName: string,
  toolName: string,
  selection: FieldSelection,
): void {
  const fpPath = join(configDir, 'field-projection.json');

  // Validate the selection against schema
  const parsed = FieldSelectionSchema.safeParse(selection);
  if (!parsed.success) {
    throw new Error(`Invalid field selection: ${parsed.error.issues.map(i => i.message).join('; ')}`);
  }

  // Validate the selection paths
  for (const path of parsed.data.fields) {
    normalizeJsonPath(path);
  }

  // Load existing data or create new
  let data: ProjectionMap = {};
  if (existsSync(fpPath)) {
    const raw = readFileSync(fpPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    const result = FieldProjectionConfig.safeParse(parsed);
    if (!result.success) {
      throw new Error(`field-projection.json validation error: ${result.error.issues.map(i => i.message).join('; ')}`);
    }
    data = result.data as ProjectionMap;
  }

  // Merge: preserve existing entries, add/update the new one
  if (!data[serverName]) {
    data[serverName] = {};
  }
  data[serverName][toolName] = selection;

  // Write atomically
  writeFileSync(fpPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function removeFieldProjection(
  configDir: string,
  serverName: string,
  toolName: string,
): boolean {
  const fpPath = join(configDir, 'field-projection.json');

  // FR-013: Do NOT create file if it doesn't exist
  if (!existsSync(fpPath)) {
    return false;
  }

  const raw = readFileSync(fpPath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  const result = FieldProjectionConfig.safeParse(parsed);
  if (!result.success) {
    throw new Error(`field-projection.json validation error: ${result.error.issues.map(i => i.message).join('; ')}`);
  }

  const data = result.data as ProjectionMap;

  // Check if entry exists
  if (!data[serverName] || !data[serverName][toolName]) {
    return false;
  }

  // Remove the entry
  delete data[serverName][toolName];

  // Clean up empty server entries
  if (Object.keys(data[serverName]).length === 0) {
    delete data[serverName];
  }

  // Write back
  writeFileSync(fpPath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
}
