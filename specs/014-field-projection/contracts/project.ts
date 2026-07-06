/**
 * SPEC: Field Projection contracts.
 *
 * Pure functions for applying field selection to MCP tool call responses.
 * No dependencies — pure TypeScript projection logic.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-tool field selection configuration. */
export interface FieldSelection {
  /** Include: keep only listed fields. Exclude: remove listed fields. */
  mode: 'include' | 'exclude';
  /** JSONPath dot-notation field paths. Must have at least 1 element. */
  fields: string[];
}

/**
 * Loaded projection config keyed by server name → tool name → FieldSelection.
 *
 * ```json
 * { "myServer": { "getData": { "mode": "include", "fields": ["id","name"] } } }
 * ```
 */
export interface ProjectionMap {
  [serverName: string]: {
    [toolName: string]: FieldSelection;
  };
}

// ---------------------------------------------------------------------------
// JSONPath normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a JSONPath to dot-notation.
 *
 * Strips leading `$.` and `$[*].` prefixes so the path works with the
 * split-on-"." projection algorithm. Non-prefixed paths are returned as-is.
 *
 * @param path — A JSONPath string (e.g., `$.field`, `$[*].a.b`, `field`)
 * @returns Dot-notation path (e.g., `field`, `a.b`)
 * @throws {Error} If path is empty, bare `$`, bare `$[*]`, or syntactically invalid
 */
export function normalizeJsonPath(path: string): string {
  if (!path) throw new Error('Path must not be empty');

  let normalized = path;
  if (normalized === '$' || normalized === '$[*]') {
    throw new Error(`Invalid bare path: "${path}"`);
  }
  if (normalized.startsWith('$.')) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('$[*].')) {
    normalized = normalized.slice(5);
  }
  normalized = normalized.replace(/\[(\d+)\]/g, '.$1');

  if (normalized.startsWith('.') || normalized.endsWith('.')) {
    throw new Error(`Malformed path: "${path}"`);
  }

  const openBrackets = (normalized.match(/\[/g) || []).length;
  const closeBrackets = (normalized.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    throw new Error(`Unbalanced brackets in path: "${path}"`);
  }

  const forbidden = /[@?()!^~]/;
  if (forbidden.test(normalized)) {
    throw new Error(`Unsupported JSONPath operator in path: "${path}"`);
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// Core projection
// ---------------------------------------------------------------------------

/**
 * Apply a field selection to a parsed JSON value.
 *
 * - Include mode: builds and returns a new object keeping only the specified paths
 * - Exclude mode: clones the input via structuredClone, then deletes specified paths
 * - Empty fields array returns the input unchanged
 * - Non-object/non-array inputs (string, number, null) pass through unchanged
 * - Missing paths are silently skipped
 *
 * @param input — Any parsed JSON value
 * @param sel — Field selection configuration
 * @returns A new value with projection applied (input is never mutated)
 */
export function applyFieldSelection(input: unknown, sel: FieldSelection): unknown {
  if (!sel.fields.length) return input;
  const paths = sel.fields.map((f) => normalizeJsonPath(f).split('.'));

  if (sel.mode === 'exclude') {
    const clone = structuredClone(input);
    for (const segs of paths) removePath(clone, segs);
    return clone;
  }
  return includeNode(input, paths);
}

// ---------------------------------------------------------------------------
// Abstract helpers (used internally by applyFieldSelection)
// ---------------------------------------------------------------------------

/**
 * Build a projected copy of `node` keeping only the given dot-paths.
 * Arrays are traversed element-wise.
 */
export function includeNode(node: unknown, paths: string[][]): unknown {
  if (Array.isArray(node)) {
    return node.map((el) => includeNode(el, paths));
  }
  if (typeof node !== 'object' || node === null) return node;

  const nodeObj = node as Record<string, unknown>;
  const byHead = new Map<string, { whole: boolean; rests: string[][] }>();
  for (const segs of paths) {
    if (segs.length === 0) continue;
    const [head, ...rest] = segs;
    if (!(head in nodeObj)) continue;
    const slot = byHead.get(head) ?? { whole: false, rests: [] };
    if (rest.length === 0) slot.whole = true;
    else slot.rests.push(rest);
    byHead.set(head, slot);
  }

  const out: Record<string, unknown> = {};
  for (const [head, { whole, rests }] of byHead) {
    out[head] = whole ? nodeObj[head] : includeNode(nodeObj[head], rests);
  }
  return out;
}

/**
 * Remove a single dot-path from a node in place, recursing into arrays.
 * Non-existent keys are silently skipped.
 */
export function removePath(node: unknown, segments: string[]): void {
  if (segments.length === 0) return;
  if (Array.isArray(node)) {
    for (const el of node) removePath(el, segments);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  const nodeObj = node as Record<string, unknown>;
  const [head, ...rest] = segments;
  if (!(head in nodeObj)) return;
  if (rest.length === 0) {
    delete nodeObj[head];
  } else {
    removePath(nodeObj[head], rest);
  }
}
