import { describe, it, expect } from 'vitest';
import { maxDepth, isUniformArray, decideConvert } from '../../src/toon/optimizer.js';
import type { ToonOptions } from '../../src/toon/stats.js';

const defaultOptions: ToonOptions = {
  indent: 2,
  flattenDepth: 4,
  threshold: 100,
  outputMode: 'dynamic',
};

describe('maxDepth', () => {
  it('returns 2 for flat object', () => {
    expect(maxDepth({ a: 1, b: 2 })).toBe(2);
  });

  it('returns 6 for deeply nested structure', () => {
    const val = { a: { b: { c: { d: { e: 'deep' } } } } };
    expect(maxDepth(val)).toBe(6);
  });

  it('returns 1 for null', () => {
    expect(maxDepth(null)).toBe(1);
  });

  it('returns 1 for primitive string', () => {
    expect(maxDepth('hello')).toBe(1);
  });

  it('returns 1 for number', () => {
    expect(maxDepth(42)).toBe(1);
  });

  it('returns 2 for flat array', () => {
    expect(maxDepth([1, 2, 3])).toBe(2);
  });

  it('returns 3 for nested array', () => {
    expect(maxDepth([[1], [2]])).toBe(3);
  });
});

describe('isUniformArray', () => {
  it('returns true for objects with same keys', () => {
    const arr = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    expect(isUniformArray(arr)).toBe(true);
  });

  it('returns false for objects with different keys', () => {
    const arr = [{ a: 1 }, { b: 2 }];
    expect(isUniformArray(arr)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isUniformArray([])).toBe(false);
  });

  it('returns false for non-array primitive', () => {
    expect(isUniformArray(42)).toBe(false);
  });

  it('returns false for non-array object', () => {
    expect(isUniformArray({ a: 1 })).toBe(false);
  });

  it('returns true for single element array', () => {
    expect(isUniformArray([{ a: 1 }])).toBe(true);
  });
});

describe('decideConvert', () => {
  it('skips when text is below threshold', () => {
    const decision = decideConvert('{"a":1}', { a: 1 }, { ...defaultOptions, threshold: 100 });
    expect(decision.convert).toBe(false);
    expect(decision.reason).toContain('threshold');
  });

  it('skips for primitive values', () => {
    const decision = decideConvert('null', null, { ...defaultOptions, threshold: 0 });
    expect(decision.convert).toBe(false);
    expect(decision.reason).toContain('primitive');
  });

  it('skips for deeply nested (depth >= 6)', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
    const decision = decideConvert(JSON.stringify(deep), deep, { ...defaultOptions, threshold: 0 });
    expect(decision.convert).toBe(false);
    expect(decision.reason).toContain('depth');
  });

  it('converts uniform array', () => {
    const arr = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    const raw = JSON.stringify(arr);
    const decision = decideConvert(raw, arr, { ...defaultOptions, threshold: 0 });
    expect(decision.convert).toBe(true);
    expect(decision.reason).toContain('uniform');
  });

  it('converts eligible payload on fallthrough', () => {
    const val = { a: 1, b: 'hello', c: true };
    const raw = JSON.stringify(val);
    const decision = decideConvert(raw, val, { ...defaultOptions, threshold: 0 });
    expect(decision.convert).toBe(true);
  });
});
