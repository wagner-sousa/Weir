import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { FieldProjectionConfig } from '../config/schema.js';
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
