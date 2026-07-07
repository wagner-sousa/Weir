import parse from 'jsonpath-rfc9535/parser';

export interface FieldSelection {
  mode: 'include' | 'exclude';
  fields: string[];
}

type Json = unknown;

function isPlainObject(v: Json): v is Record<string, Json> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function normalizeJsonPath(path: string): string {
  if (!path) throw new Error('Path must not be empty');

  try {
    if (path.startsWith('$')) {
      parse(path);
    } else {
      parse(`$.${path}`);
    }
  } catch {
    throw new Error(`Invalid JSONPath syntax: "${path}"`);
  }

  let normalized = path;

  if (normalized === '$' || normalized === '$[*]') {
    throw new Error(`Invalid bare path: "${path}"`);
  }

  if (normalized.startsWith('$.')) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('$[*].')) {
    normalized = normalized.slice(5);
  } else if (normalized === '$') {
    normalized = '';
  }

  normalized = normalized.replace(/\[(\d+)\]/g, '.$1');
  normalized = normalized.replace(/\[\*\]/g, '');

  if (normalized.startsWith('.') || normalized.endsWith('.')) {
    throw new Error(`Malformed path: "${path}"`);
  }

  return normalized;
}

function removePath(node: Json, segments: string[]): void {
  if (segments.length === 0) return;
  if (Array.isArray(node)) {
    for (const el of node) removePath(el, segments);
    return;
  }
  if (!isPlainObject(node)) return;
  const [head, ...rest] = segments;
  if (!(head in node)) return;
  if (rest.length === 0) {
    delete node[head];
  } else {
    removePath(node[head], rest);
  }
}

function includeNode(node: Json, paths: string[][]): Json {
  if (Array.isArray(node)) {
    return node.map((el) => includeNode(el, paths));
  }
  if (!isPlainObject(node)) return node;

  const byHead = new Map<string, { whole: boolean; rests: string[][] }>();
  for (const segs of paths) {
    if (segs.length === 0) continue;
    const [head, ...rest] = segs;
    if (!(head in node)) continue;
    const slot = byHead.get(head) ?? { whole: false, rests: [] };
    if (rest.length === 0) slot.whole = true;
    else slot.rests.push(rest);
    byHead.set(head, slot);
  }

  const out: Record<string, Json> = {};
  for (const [head, { whole, rests }] of byHead) {
    out[head] = whole ? node[head] : includeNode(node[head], rests);
  }
  return out;
}

export function applyFieldSelection(input: Json, sel: FieldSelection): Json {
  if (!sel.fields.length) return input;
  const paths = sel.fields.map((f) => normalizeJsonPath(f).split('.'));

  if (sel.mode === 'exclude') {
    const clone = structuredClone(input);
    for (const segs of paths) removePath(clone, segs);
    return clone;
  }
  return includeNode(input, paths);
}
