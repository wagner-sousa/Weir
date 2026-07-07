import type { ToonOptions } from './stats.js';

export interface OptimizerDecision {
  convert: boolean;
  reason: string;
}

export function maxDepth(value: unknown): number {
  if (value === null || typeof value !== 'object') {
    return 1;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 1;
    return 1 + Math.max(...value.map((item) => maxDepth(item)));
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return 1;
  return 1 + Math.max(...keys.map((key) => maxDepth(obj[key])));
}

export function isUniformArray(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (value.length === 1) {
    return typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0]);
  }
  const first = value[0];
  if (typeof first !== 'object' || first === null || Array.isArray(first)) return false;
  const firstKeys = Object.keys(first as Record<string, unknown>).sort();
  for (let i = 1; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
    const itemKeys = Object.keys(item as Record<string, unknown>).sort();
    if (itemKeys.length !== firstKeys.length) return false;
    for (let j = 0; j < firstKeys.length; j++) {
      if (itemKeys[j] !== firstKeys[j]) return false;
    }
  }
  return true;
}

export function decideConvert(
  rawText: string,
  parsed: unknown,
  options: ToonOptions,
): OptimizerDecision {
  if (rawText.length < options.threshold) {
    return { convert: false, reason: 'below threshold' };
  }
  if (parsed === null || typeof parsed !== 'object') {
    return { convert: false, reason: 'primitive value (not object/array)' };
  }
  const depth = maxDepth(parsed);
  if (depth >= 6) {
    return { convert: false, reason: 'deeply nested (depth >= 6), TOON benefit minimal' };
  }
  if (isUniformArray(parsed)) {
    return { convert: true, reason: 'uniform array — high TOON benefit' };
  }
  return { convert: true, reason: 'eligible — proceeding to conversion' };
}
